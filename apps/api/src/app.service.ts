export class AppService {
  getHello(): string {
    return 'VoltOps API is officially Online! ⚡';
  }

  // İleride buraya karmaşık hesaplamalar (gelir analizi, enerji tüketimi vb.) gelecek
  getVersion(): string {
    return '0.1.0';
  }
}