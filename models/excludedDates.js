module.exports = function (sequelize, DataTypes) {
    const ExcludedDate = sequelize.define("ExcludedDates", {
      id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true
      },
      excludedDate: {
          type: DataTypes.DATE,
          allowNull: false
      },
      excludeType: {
        type: DataTypes.ENUM("lunch", "dinner", "lunchdinner"),
        allowNull: false
      }
      });
      return ExcludedDate;
}