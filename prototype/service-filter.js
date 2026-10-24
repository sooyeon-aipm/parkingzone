// 모드 전환으로 일반 주차권의 상품 유형을 바꾸지 않는다.
export function serviceProducts(products, service) {
  return products.filter(product => {
    const type=product.service ?? (product.category==='월주차'?'monthly':product.category==='세차'?'carwash':'parking');
    return type===service;
  });
}

export function durationMatches(product, duration) {
  if (duration==='2일 이상') return product.category==='연박권';
  if (duration==='종일') return product.category==='당일권';
  const minutes={'1시간':60,'2시간':120,'3시간':180,'5시간':300,'8시간':480,'12시간':720}[duration];
  return Boolean(minutes && product.duration_minutes>=minutes);
}
