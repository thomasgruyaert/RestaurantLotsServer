module.exports = function (sequelize, DataTypes) {
  const Voucher = sequelize.define("Voucher", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    nameGifters: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nameReceivers: {
      type: DataTypes.STRING,
      allowNull: false
    },
    emailRecipient: {
      type: DataTypes.STRING,
      allowNull: false
    },
    boughtDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false
    },
    voucherAmount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    customMessage: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });
  return Voucher;
}
