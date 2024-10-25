const BookInstance = require("../models/bookinstance");
const Book = require("../models/book");

const { body, validationResult } = require("express-validator");
const bookinstance = require("../models/bookinstance");

// Display list of all BookInstances.
exports.bookinstance_list = async function (req, res, next) {
  try {
    const list_bookinstances = await BookInstance.find().populate("book").exec();
    res.render("bookinstance_list", {
      title: "Book Instance List",
      bookinstance_list: list_bookinstances,
    });

  } catch (err) {
    return next(err);
  }
};


// Display detail page for a specific BookInstance.
exports.bookinstance_detail = async (req, res, next) => {
  try {
    const id = req.params.id;
    const bookInstance = await BookInstance.findById(id)
      .populate("book")
      .exec();

    if (!bookInstance) {
      // No results.
      const err = new Error("Book copy not found");
      err.status = 404;
      return next(err);
    }

    res.render("bookinstance_detail", {
      title: "Book:",
      bookinstance: bookInstance,
    });

  } catch (err) {
    return next(err);
  }


};


// Display BookInstance create form on GET.
exports.bookinstance_create_get = async function (req, res, next) {
  try {
    const books = await Book.find({}, "title").exec()
    // Successful, so render.
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
    });

  } catch (err) {
    return next(err);

  }
};


// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate fields.
  body("book", "Book must be specified").isLength({ min: 1 }).trim(),
  body("imprint", "Imprint must be specified").isLength({ min: 1 }).trim(),
  body("due_back", "Invalid date").optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  body("book").escape(),
  body("imprint").escape(),
  body("status").trim().escape(),
  body("due_back").toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      try {
        const books = await Book.find({}, "title").exec();
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      } catch (err) {
        return next(err);
      }
      return;
    } else {
      // Data from form is valid. Save BookInstance.
      try {
        await bookinstance.save();
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      } catch (err) {
        return next(err);
      }
    }
  },
];


// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = async (req, res, next) => {
  try {
    const bookinstance = await BookInstance.findById(req.params.id).exec();


    if (!bookinstance) {
      // Если жанр не найден, перенаправляем
      return res.redirect("/catalog/bookinstances");
    }

    // Удачно, рендерим страницу удаления
    res.render("bookinstance_delete", {
      title: "Удалить экземпляр книги",
      bookinstance: bookinstance,

    });
  } catch (err) {
    return next(err);
  }
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = async (req, res, next) => {
  try {

    const bookinstance = await BookInstance.findById(req.body.bookinstanceid).exec();

    if (!bookinstance) {
      // Если экземпляра книги не существует
      return res.redirect("/catalog/bookinstances");
    }

    // Если экземпляр книги найден, удаляем его
    await BookInstance.findByIdAndDelete(req.body.bookinstanceid);

    // Успешное удаление - перенаправляем к списку экземпляров книг
    res.redirect("/catalog/bookinstances");

  } catch (err) {
    return next(err);
  }

};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = async function (req, res, next) {
  // Get book, authors and genres for form.
  try {
    const [bookinstance, books] = await Promise.all([
      BookInstance.findById(req.params.id).populate("book"),
      Book.find(),
    ])

    if (!bookinstance) {
      // No results.
      const err = new Error("Экземпляр книги не найден");
      err.status = 404;
      throw err;
      ;
    }

    res.render("bookinstance_form", {
      title: "Update экземпляр книги",
      book_list: books,
      selected_book: bookinstance.book._id,
      bookinstance,
    });
  } catch (err) {
    return next(err);
  }
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

  // Validate fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ values: "falsy" })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, // Это обязательно, иначе будет присвоен новый ID!
    });

    if (!errors.isEmpty()) {
      try {
        // Get all authors and genres for form.
        const allBooks = await Book.find({}, "title");

        return res.render("bookinstance_form", {
          title: "Update экземпляр книги",
          book_list: allBooks,
          selected_book: bookinstance.book._id,
          bookinstance,
          errors: errors.array(),
        });
      } catch (err) {
        return next(err);
      }
    }

    try {
      //  Данные из формы действительны. Обновите запись.
      const updatedBookinstance = await BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {});
      res.redirect(updatedBookinstance.url);
    } catch (err) {
      next(err);
    }
  },
];
