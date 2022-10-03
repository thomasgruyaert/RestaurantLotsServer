module.exports = function (sequelize, DataTypes) {
    const Image = sequelize.define("Image", {
      id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true
      },
      title: {
          type: DataTypes.STRING,
          allowNull: true
      },
      alt: {
          type: DataTypes.STRING,
          allowNull: true
      },
      src: {
          type: DataTypes.STRING,
          allowNull: false
      },
      fileName: {
          type: DataTypes.STRING,
          allowNull: false
      },
      type: {
          type: DataTypes.ENUM('gallery', 'menu')
      }
      });
      return Image;
}