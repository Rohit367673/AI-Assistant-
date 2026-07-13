export default class DocumentProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Returns: { success: boolean, url: string, key: string }
  async uploadDocument(fileData) {
    throw new Error('uploadDocument() not implemented');
  }
}
