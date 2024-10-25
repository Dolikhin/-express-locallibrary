const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");


// const asyncHandler = require("express-async-handler");

exports.index = async (req, res, next) => {
  // Получаем информацию о количестве книг, экземпляров книг, авторов и жанров (параллельно)
  try {
    const [
      numBooks,
      numBookInstances,
      numAvailableBookInstances,
      numAuthors,
      numGenres,
    ] = await Promise.all([
      Book.countDocuments({}),
      BookInstance.countDocuments({}),
      BookInstance.countDocuments({ status: "Available" }),
      Author.countDocuments({}),
      Genre.countDocuments({}),
    ]);

    res.render("index", {
      title: "Local Library Home",
      book_count: numBooks,
      book_instance_count: numBookInstances,
      book_instance_available_count: numAvailableBookInstances,
      author_count: numAuthors,
      genre_count: numGenres,
    });
  } catch (err) {
    next(err);
  }

};


// Display list of all Books.
exports.book_list = async function (req, res, next) {
  try {
    const list_books = await Book.find({}, "title author").populate("author").exec();
    res.render("book_list", { title: "Book List", book_list: list_books });
  } catch (err) {
    return next(err);
  }
};



// Display detail page for a specific book.
exports.book_detail = async (req, res, next) => {
  // Get details of books, book instances for specific book
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate("author").populate("genre").exec(),
    BookInstance.find({ book: req.params.id }),
  ]);

  if (book === null) {
    // No results.
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  res.render("book_detail", {
    title: book.title,
    book: book,
    book_instances: bookInstances,
  });
};


// Display book create form on GET.
exports.book_create_get = async (req, res, next) => {
  // Get all authors and genres, which we can use for adding to our book.
  const [allAuthors, allGenres] = await Promise.all([
    Author.find().sort({ family_name: 1 }).exec(),
    Genre.find().sort({ name: 1 }).exec(),
  ]);

  res.render("book_form", {
    title: "Create Book",
    authors: allAuthors,
    genres: allGenres,
  });
};

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre =
        typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),
  // Process request after validation and sanitization.

  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1 }).exec(),
      ]);

      // Mark our selected genres as checked.
      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = "true";
        }
      }
      res.render("book_form", {
        title: "Create Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: errors.array(),
      });
    } else {
      // Data from form is valid. Save book.
      await book.save();
      res.redirect(book.url);
    }
  },
];


// Display book delete form on GET.
exports.book_delete_get = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).exec();
    const bookInstances = await BookInstance.find({ book: req.params.id }).exec();

    if (!book) {
      // Если автор не найден, перенаправляем
      return res.redirect("/catalog/books");
    }

    // Удачно, рендерим страницу удаления
    res.render("book_delete", {
      title: "Delete Book",
      book: book,
      bookInstances: bookInstances,
    });
  } catch (err) {
    return next(err);
  }
};

// Handle book delete on POST.
exports.book_delete_post = async (req, res, next) => {
  try {
    const [book, book_instances] = await Promise.all([
      Book.findById(req.body.bookid).exec(),
      BookInstance.find({ book: req.body.bookid }).exec(),
    ]);

    if (!book) {
      // Если книги не существует
      return res.redirect("/catalog/books");
    }

    if (book_instances.length > 0) {
      // Если у книги есть экземпляры, рендерим ту же страницу с предупреждением
      return res.render("book_delete", {
        title: "Удалить книгу",
        book: book,
        book_instances: book_instances,
      });
    }

    // Если у книги нет экземпляров, удаляем ее
    await Book.findByIdAndDelete(req.body.bookid);
    console.log("Book deleted successfully");
    // Успешное удаление - перенаправляем к списку книг
    res.redirect("/catalog/books");


  } catch (err) {
    return next(err);
  }

};

// Display book update form on GET.
exports.book_update_get = async function (req, res, next) {
  // Get book, authors and genres for form.
  try {
    const [book, authors, genres] = await Promise.all([
      Book.findById(req.params.id).populate("author").populate("genre"),
      Author.find(),
      Genre.find(),
    ])

    if (!book) {
      // No results.
      const err = new Error("Book not found");
      err.status = 404;
      throw err;
      ;
    }

    genres.forEach((genre) => {
      book.genre.forEach((bookGenre) => {
        if (genre._id.toString() === bookGenre._id.toString()) {
          genre.checked = true;
        }
      });
    });


    res.render("book_form", {
      title: "Update Book",
      authors,
      genres,
      book,
    });
  } catch (err) {
    return next(err);
  }
};


// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  // Validate fields.
  body("title", "Title must not be empty.").isLength({ min: 1 }).trim(),
  body("author", "Author must not be empty.").isLength({ min: 1 }).trim(),
  body("summary", "Summary must not be empty.").isLength({ min: 1 }).trim(),
  body("isbn", "ISBN must not be empty").isLength({ min: 1 }).trim(),

  // Sanitize fields (no more sanitizeBody, just chain .trim().escape() directly)
  body("title").trim().escape(),
  body("author").trim().escape(),
  body("summary").trim().escape(),
  body("isbn").trim().escape(),
  body("genre.*").trim().escape(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre || [],
      _id: req.params.id, // Это обязательно, иначе будет присвоен новый ID!
    });

    if (!errors.isEmpty()) {
      try {
        // Get all authors and genres for form.
        const [authors, genres] = await Promise.all([
          Author.find(),
          Genre.find(),
        ]);

        // Mark selected genres as checked.
        genres.forEach((genre) => {
          if (book.genre.indexOf(genre._id) > -1) {
            genre.checked = "true";
          }
        });

        return res.render("book_form", {
          title: "Update Book",
          authors,
          genres,
          book,
          errors: errors.array(),
        });
      } catch (err) {
        return next(err);
      }
    }

    try {
      //  Данные из формы действительны. Обновите запись.
      const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, { new: true });
      res.redirect(updatedBook.url);
    } catch (err) {
      next(err);
    }
  },
];
