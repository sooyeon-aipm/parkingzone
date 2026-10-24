// 상세에 들어갈 때만 상품을 선택한다. 이후 갱신은 그 ID만 찾는다.
export const initialProductId = (products, requestedId = null) => requestedId ?? products[0]?.id ?? null;
export const selectedProductById = (products, id) => products.find(product => product.id === id);
