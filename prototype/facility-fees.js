const won = value => `${new Intl.NumberFormat('ko-KR').format(value)}원`;
const amount = value => Number.isInteger(value) && value >= 0;
const minutes = value => Number.isInteger(value) && value > 0;

// 확인한 요금만 설명한다. 빠진 상한·요금 단위를 추정하지 않는다.
export function facilityFeeLines(info) {
  if (!info) return ['확인된 현장 요금 정보가 없습니다.'];
  const lines = [];
  if (minutes(info.initial_free_minutes)) lines.push(`초기 무료 ${info.initial_free_minutes}분`);
  if (info.source_label) lines.push(info.source_label);
  if (minutes(info.unit_minutes) && amount(info.unit_fee_won)) lines.push(`${info.unit_minutes}분당 ${won(info.unit_fee_won)}`);
  if (minutes(info.basic_minutes) && amount(info.basic_fee_won)) lines.push(`기본 ${info.basic_minutes}분 ${won(info.basic_fee_won)}`);
  if (minutes(info.additional_minutes) && amount(info.additional_fee_won)) lines.push(`추가 ${info.additional_minutes}분당 ${won(info.additional_fee_won)}`);
  if (amount(info.hourly_fee_won)) lines.push(`1시간 기준 ${won(info.hourly_fee_won)}`);
  if (amount(info.daily_max_won)) lines.push(`일 최대 ${won(info.daily_max_won)}`);
  if (info.operating_hours) lines.push(`운영 ${info.operating_hours}`);
  return lines.length ? lines : ['확인된 현장 요금 정보가 없습니다.'];
}
