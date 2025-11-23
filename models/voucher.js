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
    voucherAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    customMessage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.ENUM("waiting", "open", "pending", "authorized", "paid", "canceled", "expired", "failed"),
      allowNull: false,
      defaultValue: "waiting"
    }
  });
  return Voucher;
}
