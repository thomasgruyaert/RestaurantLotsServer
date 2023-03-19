module.exports = function (sequelize, DataTypes) {
    const Reservation = sequelize.define("Settings", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        settingName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        settingValue: {
            type: DataTypes.STRING,
            allowNull: false
        },
        settingType: {
            type: DataTypes.ENUM("string","boolean","integer"),
            allowNull: false
        }
    });
    return Reservation;
}