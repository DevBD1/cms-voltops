export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: '@voltops/api',
      timestamp: new Date().toISOString(),
    };
  }
}
