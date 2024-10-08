const path = require('path');
require('./aliases');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const globalRouter = express();
const cors = require('cors');
const helmet = require('helmet');

// Middleware session cookie en el navegador
const session = require("express-session");

const { passport, isLoggedIn } = require('@auth/helpers/passportStrategies');
const { connectToDatabase, syncDatabase } = require('@db/connection.js');
const debug = require('debug')('&:INDEX JS');

// Sub routers
const authRouter = require('@auth/router.js');
const gestorDataRouter = require('@gestorData/router.js');
const googleCalendarRouter = require('@googleCalendar/router.js');
const calendarioRouter = require('@calendario/router.js');
const inicioRouter = require('@inicio/router.js');
const noticiasRouter = require('@noticias/router.js');
// const mapaRouter = require('@mapa/router.js')

globalRouter.use(express.json());
globalRouter.use(express.urlencoded({ extended: false }));

const corsOptions = {
    origin: ['https://myetsidi.com', 'https://calendar.myetsidi.com', 'http://localhost:3000',],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
  };
  
globalRouter.use(cors(corsOptions));


switch (process.env.NODE_ENV) {
    case 'development': {
        console.log('\x1b[31m%s\x1b[0m', 'Not using helmet in development');
        break;
    }
    case 'production':
        console.log('\x1b[33m%s\x1b[0m', 'Using helmet in production environment');
        globalRouter.use(helmet({
            referrerPolicy: { policy: 'no-referrer' },
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'",'https://*.googleapis.com', 'https://ka-f.fontawesome.com'],
                    scriptSrc: ["'self'", 'https://*.myetsidi.com', 'https://*.googleapis.com','https://apis.google.com', 'https://www.google.com/','https://cdn.jsdelivr.net','https://cdnjs.cloudflare.com','https://kit.fontawesome.com','https://unpkg.com'],
                    objectSrc: ["'none'"],
                    baseUri: ["'none'"],
                    formAction: ["'none'"],
                    frameAncestors: ["'none'"],
                },
            },
            hidePoweredBy: true, //Remove the X-Powered-By header which can reveal information about the server
            noSniff: true, //Prevent browsers from MIME-sniffing a response away from the declared content type
            frameguard: { //Prevent clickjacking attacks by ensuring that the content is not embedded in a frame
            action: 'deny'
            },
            xssFilter: true, //prevent reflected XSS attacks
        }));
        break;
    default:
        console.log('No environment provided');
    }

// Cookies session
if (process.env.NODE_ENV === 'development') {
    const pgSession = require('connect-pg-simple')(session);
    const sessionPool = require('pg').Pool;
    const sessionDBaccess = new sessionPool({
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        host: process.env.DATABASE_HOST,
        port: 5432,
        database: process.env.DATABASE_SESSION
    });

    globalRouter.use(
        session({
            store: new pgSession({
                pool: sessionDBaccess,
                tableName: 'dev_sessions',
                createTableIfMissing: true,
                pruneSessionInterval: false
            }),
            secret: process.env.COOKIE_SECRET,
            cookie: { maxAge: 86400000, secure: false, sameSite: 'lax', httpOnly: true },
            resave: false,
            saveUninitialized: false
        })
    );
} else if (process.env.NODE_ENV === 'production') {
    // Store for the cookie
    const {redisClient} = require('@utils/redisClient.js');
    const RedisStore = require('connect-redis').default 
   
    const store = new RedisStore({ client: redisClient })

    globalRouter.use(session({
        name: 'session',
        store,
        secret: process.env.COOKIE_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            secure: true,
            maxAge: 86400000 * 7, // 24h * 7
            httpOnly: true,
            sameSite: 'lax',
            name: 'sessionId'
        }
    }))
}

globalRouter.use(passport.initialize());
globalRouter.use(passport.session());

// Serving static files
globalRouter.use(express.static(path.join(__dirname, '../client/inicio/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/login/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/signup/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/dashboard/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/mailVerification/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/forget/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/errorPage/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/oauthGoogle/src')));
globalRouter.use(express.static(path.join(__dirname, '../client/privacyPolicy/src')));


globalRouter.get(['/'], (req, res, next) => {
    try {
        const file = 'inicio.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/inicio') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

// Serve login page
globalRouter.get(['/login'], (req, res, next) => {
    try {
        const file = 'login.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/login') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

// Serve signup page
globalRouter.get('/signup', (req, res, next) => {
    try {
        const file = 'signup.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/signup') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

globalRouter.get('/mailVerification', (req, res, next) => {
    try {
        const file = 'mailVerification.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/mailVerification') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

globalRouter.get('/forget', (req, res, next) => {
    try {
        const file = 'forget.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/forget') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

globalRouter.get('/privacy-policy', (req, res, next) => {
    try {
        const file = 'privacyPolicy.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/privacyPolicy') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

// Verifies that the user is logged in before going to any other end point
globalRouter.use('/auth', authRouter);
globalRouter.use('', isLoggedIn);

// Serve dashboard files
globalRouter.get('/dashboard.js', async (req, res, next) => {
    try {
        const file = 'dashboard.js';
        res.sendFile(file, { root: path.join(__dirname, '../client/dashboard/src/js') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (e) {
        console.log(e, 'ADMIN_ROUTER error');
    }
});

globalRouter.get('/dashboard', (req, res, next) => {
    try {
        const file = 'dashboard.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/dashboard') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

// Serve OAuth Google page
globalRouter.get('/oauthgoogle', (req, res, next) => {
    try {
        const file = 'oauthGoogle.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/oauthGoogle') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});

// Logout route
globalRouter.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            debug('ERROR LOGOUT', err);
            return next(err);
        }
        debug('Logout done!!');
        req.session.destroy();
        res.redirect('/login');
    });
});

// Other routers
globalRouter.use('/gestorData', gestorDataRouter);
globalRouter.use('/googleCalendar', googleCalendarRouter);
globalRouter.use('/calendario', calendarioRouter);
globalRouter.use('/inicio', inicioRouter);
globalRouter.use('/noticias', noticiasRouter);
// globalRouter.use('/mapa', mapaRouter);


globalRouter.all('*', (req, res) => {
	try {
        const file = 'errorPage.html';
        res.sendFile(file, { root: path.join(__dirname, '../client/errorPage') }, function (err) {
            if (err) {
                console.log(err);
            }
        });
    } catch (err) {
        console.log(err, 'error');
    }
});


const port = process.env.PORT || 5050;

globalRouter.listen(port, async () => {
    await connectToDatabase();
    await syncDatabase();
    console.log(`Servidor http corriendo en el puerto ${port}`);
});