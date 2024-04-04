module.exports = function (sequelize, DataTypes) {
    const GiftVoucher = sequelize.define("GiftVoucher", {
      id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true
      },
      nameGifter: {
        type: DataTypes.STRING,
        allowNull: false
    },
    emailGifter: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nameReceiver: {
        type: DataTypes.STRING,
        allowNull: false
    },
    voucherValue: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    voucherCode: {
        type: DataTypes.STRING,
        allowNull: false
    },
    expireDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    });
    return GiftVoucher;
}