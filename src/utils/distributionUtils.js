export function computeCaffeineDistribution(records, drinks, sortBy) {
  const sourceData = {};
  let totalIntake = 0, totalCount = 0;

  records.forEach(record => {
    if (!record || typeof record.amount !== 'number' || record.amount <= 0) return;
    let key, name;
    if (record.drinkId) {
      key = record.drinkId;
      const d = drinks.find(d=>d.id===record.drinkId);
      name = d?.name || record.customName || record.name || '未知饮品';
    } else {
      key = record.customName||record.name||'custom-manual-entry';
      name = record.customName||record.name||'自定义摄入';
    }
    if (!sourceData[key]) sourceData[key] = { amount:0, count:0, name };
    sourceData[key].amount += record.amount;
    sourceData[key].count += 1;
    totalIntake += record.amount;
    totalCount += 1;
  });

  if (totalIntake === 0) return [];

  const arr = Object.entries(sourceData).map(([id, d]) => ({
    id, name: d.name, amount: Math.round(d.amount), count: d.count,
    percentage: sortBy==='count'
      ? (d.count/totalCount)*100
      : (d.amount/totalIntake)*100
  }));

  arr.sort((a,b)=>
    sortBy==='count' ? b.count-a.count : b.amount-a.amount
  );

  let sum = 0;
  return arr.map((item,i)=>{
    if (i===arr.length-1) {
      item.percentage = Math.round((100-sum)*100)/100;
    } else {
      item.percentage = Math.round(item.percentage*100)/100;
      sum += item.percentage;
    }
    return item;
  });
}
