
// Declare global types for window.gapi and window.google
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'PORTFOLIO NOTES';
const FILE_NAME = 'portfolio_notes_data.json';
const BACKUP_PREFIX = 'portfolio_backup_';

export interface CloudData {
  holdings: any[];
  realizedProfits: Record<string, number>;
  cashBalances: Record<string, any>;
  lastSynced: string;
}

export class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private clientId: string;
  private folderId: string | null = null;
  private isGapiInitialized: boolean = false;

  constructor(clientId: string) {
    this.clientId = clientId.trim();
  }

  async initGapi() {
    return new Promise<void>((resolve, reject) => {
      if (!window.gapi) {
        reject(new Error("GAPI script not loaded"));
        return;
      }
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
          });
          this.isGapiInitialized = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  hasRequiredScopes(response: any): boolean {
    const grantedScopes = response.scope || response.granted_scopes || '';
    if (!grantedScopes) return false;
    const decodedScopes = decodeURIComponent(grantedScopes).toLowerCase();
    const targetScope = SCOPES.toLowerCase();
    return decodedScopes.split(' ').some(s => s === targetScope);
  }

  async revokeToken() {
    return new Promise<void>((resolve) => {
      const token = this.accessToken || window.gapi?.client?.getToken()?.access_token;
      if (token) {
        window.google?.accounts?.oauth2?.revoke(token, () => {
          this.accessToken = null;
          if (window.gapi?.client) window.gapi.client.setToken(null);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  initTokenClient(callback: (resp: any) => void) {
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity Services not loaded");
    }
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: SCOPES,
      enable_serial_consent: true,
      callback: (resp: any) => {
        if (resp.error) return;
        this.accessToken = resp.access_token;
        if (window.gapi?.client) {
          window.gapi.client.setToken({ access_token: resp.access_token });
        }
        callback(resp);
      },
    });
  }

  requestToken() {
    if (!this.tokenClient) throw new Error("Token client not ready");
    this.tokenClient.requestAccessToken({ 
      prompt: 'select_account consent',
      enable_serial_consent: true
    });
  }

  async getOrCreateFolder(): Promise<string> {
    if (this.folderId) return this.folderId;
    if (!this.isGapiInitialized) await this.initGapi();
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      const folders = response.result.files;
      if (folders && folders.length > 0) {
        this.folderId = folders[0].id;
        return this.folderId!;
      }
      const folderMetadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      };
      const createResponse = await window.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });
      if (!createResponse.result.id) throw new Error("PERMISSION_DENIED");
      this.folderId = createResponse.result.id;
      return this.folderId!;
    } catch (error: any) {
      const status = error?.status || error?.result?.error?.code;
      if (status === 403 || status === 401 || status === 404) throw new Error("PERMISSION_DENIED");
      throw error;
    }
  }

  async findDataFile(): Promise<string | null> {
    const folderId = await this.getOrCreateFolder();
    const response = await window.gapi.client.drive.files.list({
      q: `name = '${FILE_NAME}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive'
    });
    const files = response.result.files;
    return files && files.length > 0 ? files[0].id : null;
  }

  async loadPortfolioData(): Promise<CloudData | null> {
    try {
      const fileId = await this.findDataFile();
      if (!fileId) return null;
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return response.result as CloudData;
    } catch (error) {
      console.error("Data loading error:", error);
      return null;
    }
  }

  private async cleanupBackups(folderId: string) {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name contains '${BACKUP_PREFIX}' and '${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        spaces: 'drive'
      });
      const files = response.result.files || [];
      if (files.length > 50) {
        const toDelete = files.slice(50);
        for (const file of toDelete) {
          await window.gapi.client.drive.files.delete({ fileId: file.id });
        }
      }
    } catch (error) {
      console.warn("Backup cleanup failed:", error);
    }
  }

  async uploadData(data: CloudData) {
    const token = this.accessToken || window.gapi?.client?.getToken()?.access_token;
    if (!token) throw new Error("Unauthorized");
    try {
      const folderId = await this.getOrCreateFolder();
      const fileId = await this.findDataFile();
      const body = JSON.stringify({ ...data, lastSynced: new Date().toISOString() });

      // 1. 메인 파일 업데이트
      if (fileId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: body,
        });
      } else {
        const metadata = { name: FILE_NAME, mimeType: 'application/json', parents: [folderId] };
        await this.createMultipartFile(token, metadata, body);
      }

      // 2. 백업 파일 생성 (Timestamped)
      try {
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        const backupName = `${BACKUP_PREFIX}${timestamp}.json`;
        const backupMetadata = { name: backupName, mimeType: 'application/json', parents: [folderId] };
        await this.createMultipartFile(token, backupMetadata, body);
        
        // 3. 백업 로테이션 (최대 50개 유지)
        await this.cleanupBackups(folderId);
      } catch (backupError) {
        console.warn("Secondary backup failed, but main save succeeded:", backupError);
      }
    } catch (error: any) {
      if (error.message === 'PERMISSION_DENIED') throw error;
      throw new Error("Sync Failed");
    }
  }

  private async createMultipartFile(token: string, metadata: any, body: string) {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    const multipartRequestBody =
        delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/json\r\n\r\n' + body + close_delim;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartRequestBody,
    });
    if (!response.ok) throw new Error("Upload failed");
    return await response.json();
  }
}
