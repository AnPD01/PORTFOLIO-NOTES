
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
    return new Promise<void>((resolve, reject) => {
      if (!window.gapi) {
        console.error("GAPI script not loaded");
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
          console.error("GAPI client init error:", err);
          reject(err);
        }
      });
    });
  }

  initTokenClient(callback: (resp: any) => void) {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error("Google Identity Services script not loaded");
    }
    
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          console.error("OAuth2 error:", resp.error);
          return;
        }
        this.accessToken = resp.access_token;
        callback(resp);
      },
    });
  }

  requestToken() {
    if (!this.tokenClient) {
      throw new Error("Token client not initialized. Call initTokenClient first.");
    }
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  async findDataFile(): Promise<string | null> {
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `name = '${FILE_NAME}' and trashed = false`,
        fields: 'files(id, name)',
      });
      const files = response.result.files;
      return files && files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error("Error finding data file:", error);
      return null;
    }
  }

  async downloadData(fileId: string): Promise<CloudData | null> {
    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      return response.result as CloudData;
    } catch (error) {
      console.error("Error downloading data:", error);
      return null;
    }
  }

  async uploadData(data: CloudData) {
    if (!this.accessToken) {
      throw new Error("No access token available. Please login again.");
    }

    const fileId = await this.findDataFile();
    const metadata = {
      name: FILE_NAME,
      mimeType: 'application/json',
    };
    const body = JSON.stringify({ ...data, lastSynced: new Date().toISOString() });

    try {
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
    } catch (error) {
      console.error("Error uploading data to Drive:", error);
      throw error;
    }
  }
}
