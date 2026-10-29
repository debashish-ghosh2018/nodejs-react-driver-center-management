const {getSetting} = require("./appSettings.service");

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function getDefaultCommission() {
  const type = await getSetting("driverCommission","type","PERCENTAGE");
  const value = await getSetting("driverCommission","value",10);
  const includeAllowances = await getSetting("driverCommission","includeAllowances",false);

  return {type,value: Number(value || 0),includeAllowances: Boolean(includeAllowances)};
}

function calculateFare(booking) {
  const total = Number(booking.baseFare || 0) + Number(booking.driverAllowance || 0) + Number( booking.nightAllowance || 0) + Number(booking.tollCharges || 0) + Number(booking.parkingCharges || 0) + Number(booking.stateTax || 0) + Number(booking.otherCharges || 0) - Number(booking.discountAmount || 0);

  return Math.max(0, toMoney(total));
}

function calculateCommission({fare, baseFare, driverAllowance = 0, nightAllowance = 0, type, rate, includeAllowances = false}) {
  let commissionBase = Number(baseFare ?? fare ?? 0);

  if (includeAllowances) {
    commissionBase += Number(driverAllowance || 0);
    commissionBase += Number(nightAllowance || 0);
  }

  let commissionAmount = 0;
  if (type === "PERCENTAGE") {
    commissionAmount = commissionBase * (Number(rate || 0) / 100);
  } else {
    commissionAmount = Number(rate || 0);
  }

  commissionAmount = Math.max(0, toMoney(commissionAmount));

  /*
   * Driver receives fare minus
   * platform commission.
   *
   * If toll/state tax should not
   * be part of driver earning,
   * this calculation can be
   * changed later.
   */
  const driverNetEarning = Math.max(0,toMoney(Number(fare || 0) - commissionAmount));

  return {commissionBase: toMoney(commissionBase),commissionAmount,driverNetEarning};
}

async function applyDefaultCommission(bookingData) {
  const config = await getDefaultCommission();
  const fare = calculateFare(bookingData);
  const result = calculateCommission({fare,baseFare: bookingData.baseFare,driverAllowance: bookingData.driverAllowance,nightAllowance: bookingData.nightAllowance,type: config.type,rate: config.value,includeAllowances: config.includeAllowances});

  return {...bookingData, fare,driverCommissionType: config.type,driverCommissionRate: config.value,driverCommissionAmount: result.commissionAmount,driverNetEarning: result.driverNetEarning};
}

module.exports = {calculateFare,calculateCommission,getDefaultCommission,applyDefaultCommission};