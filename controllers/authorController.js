var Author = require("../models/author");
const Book = require("../models/book");
const { body, validationResult } = require("express-validator");


// Display list of all Authors.
exports.author_list = async function (req, res, next) {
  try {
    const list_authors = await Author.find()
      .sort([["family_name", "ascending"]])
      .exec()
    res.render("author_list", {
      title: "Author List",
      author_list: list_authors,
    });


  } catch (err) {
    return next(err);
  }
};


// Display detail page for a specific Author.
exports.author_detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Выполнение запросов параллельно с помощью Promise.all
    const [author, allBooksByAuthor] = await Promise.all([
      Author.findById(id),
      Book.find({ author: id }, "title summary"),
    ]);

    if (!author) {
      const err = new Error("Author not found");
      err.status = 404;
      return next(err);
    }

    // Рендерим страницу с деталями автора и его книг
    res.render("author_detail", {
      title: "Author Detail",
      author,
      author_books: allBooksByAuthor,
    });
  } catch (err) {
    next(err); // Передача ошибки в middleware
  }
};


// Display Author create form on GET.
exports.author_create_get = (req, res, next) => {
  res.render("author_form", { title: "Create Author" });
};


// Handle Author create on POST.
exports.author_create_post = [
  // Validate and sanitize fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .isAlphanumeric()
    .withMessage("First name has non-alphanumeric characters."),
  body("family_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .isAlphanumeric()
    .withMessage("Family name has non-alphanumeric characters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create Author object with escaped and trimmed data
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render("author_form", {
        title: "Create Author",
        author: author,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.

      // Save author.
      await author.save();
      // Redirect to new author record.
      res.redirect(author.url);
    }
  },
];



// Отображать форму для удаления автора GET
exports.author_delete_get = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id).exec();
    const authors_books = await Book.find({ author: req.params.id }).exec();

    if (!author) {
      // Если автор не найден, перенаправляем
      return res.redirect("/catalog/authors");
    }

    // Удачно, рендерим страницу удаления
    res.render("author_delete", {
      title: "Delete Author",
      author: author,
      author_books: authors_books,
    });
  } catch (err) {
    return next(err);
  }
};


// Обработчик удаления автора POST.
exports.author_delete_post = async (req, res, next) => {
  try {
    const [author, authors_books] = await Promise.all([
      Author.findById(req.body.authorid).exec(),
      Book.find({ author: req.body.authorid }).exec(),
    ]);

    if (!author) {
      // Если автора не существует
      return res.redirect("/catalog/authors");
    }

    if (authors_books.length > 0) {
      // Если у автора есть книги, рендерим ту же страницу с предупреждением
      return res.render("author_delete", {
        title: "Delete Author",
        author: author,
        author_books: authors_books,
      });
    }

    // Если у автора нет книг, удаляем его
    await Author.findByIdAndDelete(req.body.authorid);

    // Успешное удаление - перенаправляем к списку авторов
    res.redirect("/catalog/authors");


  } catch (err) {
    return next(err);
  }

};


// Показать форму обновления автора по запросу GET.
exports.author_update_get = async function (req, res, next) {
  // Get book, authors and genres for form.
  try {
    const author = await Author.findById(req.params.id)
  

    if (!author) {
      // No results.
      const err = new Error("Автор не найден!");
      err.status = 404;
      throw err;
      ;
    }

   


    res.render("author_form", {
      title: "Обновить автора",
      author,
    });
  } catch (err) {
    return next(err);
  }
};

// Обновить автора по запросу POST.
exports.author_update_post = [
  // Convert the genre to an array
  

  // Validate fields.
  body("first_name", "Имя must not be empty.").isLength({ min: 1 }).trim(),
  body("family_name", "Фамилия must not be empty.").isLength({ min: 1 }).trim(),
  body("date_of_birth", "Дата рождения must not be empty.").optional({ values: "falsy" }).isISO8601().toDate(),
  body("date_of_death", "ISBN must not be empty").optional({ values: "falsy" }).isISO8601().toDate(),

  // Sanitize fields (no more sanitizeBody, just chain .trim().escape() directly)
  body("first_name").trim().escape(),
  body("family_name").trim().escape(),
  body("date_of_birth").trim().escape(),
  body("date_of_death").trim().escape(),
  

  // Process request after validation and sanitization.
  async (req, res, next) => {
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id, // Это обязательно, иначе будет присвоен новый ID!
    });

    if (!errors.isEmpty()) {
      try {
  

        return res.render("author_form", {
          title: "Update Author",
          author,
          errors: errors.array(),
        });
      } catch (err) {
        return next(err);
      }
    }

    try {
      //  Данные из формы действительны. Обновите запись.
      const updatedAuthor = await Author.findByIdAndUpdate(req.params.id, author);
      res.redirect(updatedAuthor.url);
    } catch (err) {
      next(err);
    }
  },
];
