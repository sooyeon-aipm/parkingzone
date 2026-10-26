// 공개 측정 ID만 입력한다. GA4 API secret/개인정보를 넣지 않는다.
export const analyticsConfig = Object.freeze({
  measurementId: '', // 새 GA4 웹 스트림의 G-… ID 발급 후 입력
  appVersion: '20261026-ut1',
  studyRound: 'round_1',
  productionHosts: ['parkingzone.vercel.app'],
});
