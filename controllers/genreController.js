const Genre = require("../models/genre");
const Book = require("../models/book");
const async = require("async");
const { body, validationResult } = require("express-validator");



// Отображение списка всех жанров
exports.genre_list = async function (req, res, next) {
  try {
    const list_genres = await Genre.find()
      .sort([["name", "ascending"]])
      .exec()
    res.render("genre_list", {
      title: "Список жанров",
      genre_list: list_genres,
    })
  } catch (err) {
    return next(err)
  }
};

// Отображение подробной страницы для определенного жанра.
exports.genre_detail = async function (req, res, next) {
  try {

    const genre = await Genre.findById(req.params.id).exec();
    if (genre == null) {
      // No results.
      var err = new Error("Жанр не найден");
      err.status = 404;
      return next(err);
    }

    const genre_books = await Book.find({ genre: req.params.id }).exec();

    // Successful, so render
    res.render("genre_detail", {
      title: "Genre Detail",
      genre: genre,
      genre_books: genre_books,
    });

  } catch (err) {
    return next(err);
  }
};


// Отображение формы создания жанра с GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Создать новый жанр" });
};


// Обработка создания жанра в POST.
exports.genre_create_post = [
  // Проверка и очистка поля имени
  body("name")
    .trim()
    .isLength({ min: 3 }).withMessage("Название жанра должно содержать не менее 3 символов")
    .escape(),

  // Обработка запроса после проверки
  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Создает объект жанра с обработанными данными
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // При наличии ошибок возвращаем форму с ошибками
      return res.render("genre_form", {
        title: "Создать жанр",
        genre,
        errors: errors.array(),
      }); 
    } 

    try {
      // Проверяем, существует ли уже такой жанр (с учётом регистра)
      const genreExists = await Genre.findOne({ name: req.body.name })
        .collation({ locale: "en", strength: 2 });

      if (genreExists) {
        // Если жанр уже существует, перенаправляем на его страницу
        return res.redirect(genreExists.url);
      }

      // Сохраняем новый жанр и перенаправляем на его страницу
      await genre.save();
      res.redirect(genre.url);

    } catch (error) {
      next(error); // Передаем ошибки в глобальный обработчик
    }
  },
];
     

// Отобразить форму удаления жанра с GET.
exports.genre_delete_get = async (req, res, next) => {
  try {
    const genre = await Genre.findById(req.params.id).exec();
    const books = await Book.find({ genre: req.params.id }).exec();

    if (!genre) {
      // Если жанр не найден, перенаправляем
      return res.redirect("/catalog/genres");
    }

    // Удачно, рендерим страницу удаления
    res.render("genre_delete", {
      title: "Удалить жанр",
      genre: genre,
      books: books,
    });
  } catch (err) {
    return next(err);
  }
};;

// Handle Genre delete on POST.
exports.genre_delete_post = async (req, res, next) => {
  try {
    const [genre, genre_books] = await Promise.all([
      Genre.findById(req.body.genreid).exec(),
      Book.find({ genre: req.body.genreid }).exec(),
    ]);

    if (!genre) {
      // Если книги не существует
      return res.redirect("/catalog/genres");
    }

    if (genre_books.length > 0) {
      // Если книги этого жанра, рендерим ту же страницу с предупреждением
      return res.render("genre_delete", {
        title: "Удалить жанр",
        genre: genre,
        genre_books: genre_books,
      });
    }

    // Если у книги нет экземпляров, удаляем ее
    await Genre.findByIdAndDelete(req.body.genreid);
    console.log("Genre deleted successfully");
    // Успешное удаление - перенаправляем к списку книг
    res.redirect("/catalog/books");


  } catch (err) {
    return next(err);
  }

};

// Display Genre update form on GET.
exports.genre_update_get = async function (req, res, next) {
  // Get book, authors and genres for form.
  try {
    const genre = await Genre.findById(req.params.id);

    if (!genre) {
      // No results.
      const err = new Error("Жанр не найден");
      err.status = 404;
      throw err;
      ;
    }

    res.render("genre_form", {
      title: "Update жанр",
      genre,
    });
  } catch (err) {
    return next(err);
  }
};

// Handle Genre update on POST.
exports.genre_update_post = [

  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),


  // Process request after validation and sanitization.
  async (req, res, next) => {
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const genre = new Genre({
      name: req.body.name,
      _id: req.params.id, // Это обязательно, иначе будет присвоен новый ID!
    });

    if (!errors.isEmpty()) {
      try {

        return res.render("genre_form", {
          title: "Update Genre",
          genre,
          errors: errors.array(),
        });
      } catch (err) {
        return next(err);
      }
    }

    try {
      //  Данные из формы действительны. Обновите запись.
      const updatedGenre = await Genre.findByIdAndUpdate(req.params.id, genre, {});
      res.redirect(updatedGenre.url);
    } catch (err) {
      next(err);
    }
  },
];
