export interface ServerLogger {
  sendData(endpoint: string, data: any): Promise<Response> | Response;
}
