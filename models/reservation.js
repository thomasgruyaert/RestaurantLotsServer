module.exports = function (sequelize, DataTypes) {
    const Reservation = sequelize.define("Reservation", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mobileNr: {
            type: DataTypes.STRING,
            allowNull: false
        },
        nPeople: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        mealType: {
            type: DataTypes.ENUM("lunch", "dinner"),
            allowNull: false
        },
        reservedDateTime: {
            type: DataTypes.DATE,
            allowNull: false
        },
        payWithVoucher: {
            type: DataTypes.BOOLEAN
        },
        additionalComments: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM("pending", "approved", "expired", "refused"),
            allowNull: false
        },
        confirmationCode: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        }
    });
    return Reservation;
}