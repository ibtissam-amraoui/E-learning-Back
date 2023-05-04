// cartItem.js

class CartItem {
    constructor(name, price, category, field, teacherId, description, image) {
      this.name = name;
      this.price = price;
      this.category = category;
      this.field = field;
      this.teacherId = teacherId;
      this.description = description;
      this.image = image;
    }
  }
  
  module.exports = CartItem;
  