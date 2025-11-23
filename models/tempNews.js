module.exports = function (sequelize, DataTypes) {
    const Reservation = sequelize.define("TempNews", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        content: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM("Homepagina", "Reservatiepagina","Galerijpagina","Menupagina", "Voucherpagina"),
            allowNull: false
        },
        expirationDate: {
            type: DataTypes.DATE,
            allowNull: true
        }
    });
    return Reservation;
}
