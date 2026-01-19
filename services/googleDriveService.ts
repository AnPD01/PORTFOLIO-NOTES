
// Fix: Declare global types for window.gapi and window.google
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
    return decodedScopes.includes(SCOPES.toLowerCase());
  }

  /**
   * 기존 인증 세션을 완전히 서버에서 무효화합니다. (권한 재요청용)
   */
  async revokeToken() {
    if (this.accessToken) {
      window.google?.accounts?.oauth2?.revoke(this.accessToken, () => {
        console.log("Token revoked");
        this.accessToken = null;
      });
    }
  }

  initTokenClient(callback: (resp: any) => void) {
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity Services not loaded");
    }
    
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: SCOPES,
      // enable_serial_consent: true -> 권한을 개별적으로 선택할 수 있는 창을 강제함
      enable_serial_consent: true,
      callback: (resp: any) => {
        if (resp.error) {
          console.error("Token client error:", resp.error);
          return;
        }
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
    // select_account와 consent를 조합하여 확실하게 동의 창을 띄움
    this.tokenClient.requestAccessToken({ prompt: 'select_account consent' });
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
      if (status === 403 || status === 401 || status === 404 || error?.result?.error?.status === 'PERMISSION_DENIED') {
        throw new Error("PERMISSION_DENIED");
      }
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

  async downloadData(fileId: string): Promise<CloudData | null> {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.result as CloudData;
  }

  async uploadData(data: CloudData) {
    if (!this.accessToken) throw new Error("Unauthorized");

    try {
      const folderId = await this.getOrCreateFolder();
      const fileId = await this.findDataFile();
      const body = JSON.stringify({ ...data, lastSynced: new Date().toISOString() });

      if (fileId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
          body: body,
        });
      } else {
        const metadata = { name: FILE_NAME, mimeType: 'application/json', parents: [folderId] };
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const multipartRequestBody =
            delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
            delimiter + 'Content-Type: application/json\r\n\r\n' + body + close_delim;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'multipart/related; boundary=' + boundary },
          body: multipartRequestBody,
        });
        if (!response.ok) throw new Error("Upload failed");
      }
    } catch (error: any) {
      if (error.message === 'PERMISSION_DENIED') throw error;
      throw new Error("Sync Failed");
    }
  }
}
