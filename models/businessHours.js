module.exports = function (sequelize, DataTypes) {
    const BusinessHours = sequelize.define("BusinessHours", {
      weekdayId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true
      },
      weekdayFull: {
          type: DataTypes.ENUM("Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"),
          allowNull: false
      },
      isOpen: {
          type: DataTypes.BOOLEAN
      },
      openingTimeLunch: {
          type: DataTypes.TIME,
          allowNull: true
      },
      closingTimeLunch: {
          type: DataTypes.TIME,
          allowNull: true
      },
      openingTimeDinner: {
        type: DataTypes.TIME,
        allowNull: true
    },
    closingTimeDinner: {
        type: DataTypes.TIME,
        allowNull: true
    }
      });
      return BusinessHours;
}