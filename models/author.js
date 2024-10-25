var mongoose = require("mongoose");
const moment = require("moment");


var Schema = mongoose.Schema;

var AuthorSchema = new Schema({
  first_name: { type: String, required: true, max: 100 },
  family_name: { type: String, required: true, max: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Виртуальное свойство для полного имени автора
AuthorSchema.virtual("name").get(function () {
  return this.family_name + ", " + this.first_name;
});

// Виртуальное свойство - URL автора
AuthorSchema.virtual("url").get(function () {
  return "/catalog/author/" + this._id;
});

AuthorSchema.virtual("date_of_birth_formatted").get(function () {
  return this.date_of_birth ? moment(this.date_of_birth).format('DD-MM-YYYY') : '';
});

AuthorSchema.virtual("lifespan").get(function () {
  const date_of_birth_formated = moment(this.date_of_birth).format('DD-MM-YYYY');
  const date_of_death_formated = moment(this.date_of_death).format('DD-MM-YYYY');
  return ` ${date_of_birth_formated} - ${date_of_death_formated}`;
});

//Export model
module.exports = mongoose.model("Author", AuthorSchema);
