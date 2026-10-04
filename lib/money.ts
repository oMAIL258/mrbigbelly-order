export const baht = (satang: number) => `฿${(satang / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
