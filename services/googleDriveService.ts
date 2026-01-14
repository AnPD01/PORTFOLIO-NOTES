
// Fix: Declare global types for window.gapi and window.google to avoid TypeScript compilation errors
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
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

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  async initGapi() {
    return new Promise<void>((resolve) => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        resolve();
      });
    });
  }

  initTokenClient(callback: (resp: any) => void) {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) return;
        this.accessToken = resp.access_token;
        callback(resp);
      },
    });
  }

  requestToken() {
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  async findDataFile(): Promise<string | null> {
    const response = await window.gapi.client.drive.files.list({
      q: `name = '${FILE_NAME}' and trashed = false`,
      fields: 'files(id, name)',
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
    const fileId = await this.findDataFile();
    const metadata = {
      name: FILE_NAME,
      mimeType: 'application/json',
    };
    const body = JSON.stringify({ ...data, lastSynced: new Date().toISOString() });

    if (fileId) {
      // Update existing file
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body,
      });
    } else {
      // Create new file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: form,
      });
    }
  }
}
