
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

  constructor(clientId: string) {
    this.clientId = clientId;
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
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  initTokenClient(callback: (resp: any) => void) {
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity Services not loaded");
    }
    
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) return;
        this.accessToken = resp.access_token;
        // GAPI에 토큰 주입
        window.gapi.client.setToken({ access_token: resp.access_token });
        callback(resp);
      },
    });
  }

  requestToken() {
    this.tokenClient?.requestAccessToken({ prompt: 'consent' });
  }

  async getOrCreateFolder(): Promise<string> {
    if (this.folderId) return this.folderId;

    try {
      // 1. 폴더 존재 여부 확인
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

      // 2. 폴더가 없으면 'root'(내 드라이브)에 생성
      const folderMetadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'] 
      };

      const createResponse = await window.gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });

      this.folderId = createResponse.result.id;
      return this.folderId!;
    } catch (error) {
      console.error("Folder operation failed:", error);
      throw error;
    }
  }

  async findDataFile(): Promise<string | null> {
    try {
      const folderId = await this.getOrCreateFolder();
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${FILE_NAME}' and '${folderId}' in parents and trashed = false`,
        fields: 'files(id)',
      });
      const files = response.result.files;
      return files && files.length > 0 ? files[0].id : null;
    } catch (error) {
      return null;
    }
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
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
    }
  }
}
