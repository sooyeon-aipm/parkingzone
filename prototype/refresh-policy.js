// 자동 조회는 성공 후 1분, 실패 후에도 최소 1분 간격을 둔다.
// 수동 요청도 진행 중인 요청은 공유한다.
export function createRefreshPolicy({load, now = () => performance.now(), interval = 60000}) {
  let pending = null, lastSuccess = -Infinity, lastAttempt = -Infinity;
  return {
    refresh({force = false, origin = 'auto'} = {}) {
      if (pending) return pending;
      const time = now();
      if (!force && time - Math.max(lastSuccess, lastAttempt) < interval) return Promise.resolve(false);
      lastAttempt = time;
      pending = Promise.resolve().then(()=>load({origin})).then(result => {
        if (result === false) return false;
        lastSuccess = now();
        return true;
      }).finally(() => { pending = null; });
      return pending;
    },
  };
}
