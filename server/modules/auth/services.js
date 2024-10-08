const { passport } = require('@auth/helpers/passportStrategies');

const { knex } = require('@db/knex.js');
const Usuarios = require('@db/models/usuarios.js')

const debug = require('debug')('&:SIGNUP_LOGIN_SERVICES')
const {encryptPassword} = require("@auth/helpers/encryptDecrypt")
const {createRandomString} = require('@utils/utils.js')
const {sendEmailCodigo} = require('@email/mails.js')
const {correoVerificacion, correoRecuperarContrasena} = require('@email/templatesCorreoCodigo.js');
const { upmAccounts } = require('@utils/upmAccounts');

if (process.env.NODE_ENV === 'production') {
const {limiter} = require('@auth/helpers/passportStrategies.js');
}


async function authenticateUser(req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            console.error('Error during authentication:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        } else if (!user) {
            console.warn('Authentication failed:', info.message);
            return res.status(401).json({ message: info.message });
        } else {
            req.logIn(user, function (err) {
                if (err) {
                    console.error('Error during login:', err);
                    return res.status(500).json({ message: 'Internal Server Error' });
                } else {
                    return res.status(200).json({ message: 'Login successful' });
                }
            });
        }
    })(req, res, next);
}


async function signupNewUser(req, res) {
    try {
        const {name, email, password} = req.body
        
        const sanitizedEmail = email.toLowerCase() + '@alumnos.upm.es'
        
        console.log(sanitizedEmail,'sanitizedemail--------')
        const existingUser = await verifyUserAlreadyExists(sanitizedEmail)
        if (existingUser) {

            return res.status(400).json({ message: 'Usuario ya existe' });
        } 
        else if ( existingUser?.validated === false)  {
            return res.status(400).json({ message: 'Usuario ya existe, ¡falta validación!'});
        }
        else{
            const encryptedPassword = await encryptPassword(password)
        
             const done = await createNewUser(name, sanitizedEmail, encryptedPassword)
        
             console.log(done,'done')
            return res.status(200).json({ message: 'Signup successful', email:email.toLowerCase() })
            
        }
    } catch (error) {
        debug('SIGN UP NEW USER')
        debug(error)
        res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
    }

}



async function verifyUserAlreadyExists(email) {
   try {
       const userAlreadyExists = await knex('t_usuarios').where({ email }).first('id','validated')
       console.log('veryfyinguser', userAlreadyExists)
       if (userAlreadyExists) return userAlreadyExists
        else return undefined
   } catch (error) {
    console.error('error verifying if user exists',error)
    res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
   } 
}


async function createNewUser(username, email, password) {
    try {

       const done = await Usuarios.create({
            username,
            email,
            password,
            role: 'alumno'
        });
return done
    } catch (error) {
        console.error('error creating NEW USER',error)
        res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
    }
}



async function enviarCorreoVerificacion(req, res) {
    try {
        const {email} = req.body

        let sanitizedEmail
        if (upmAccounts.includes(email.toLowerCase())) sanitizedEmail = email.toLowerCase() + '@upm.es'
        else sanitizedEmail = email.toLowerCase() + '@alumnos.upm.es'
        

        console.log(sanitizedEmail,'sanitized email v2')
        const existingUser = await verifyUserAlreadyExists(sanitizedEmail)
        console.log(existingUser,'existingUser')
        if (!existingUser)  return res.status(400).json({ message: 'El usuario no existe' });
        
        if ( existingUser.validated === true)  return res.status(400).json({ message: 'Ya se ha verificado' });
        
        // if (process.env.NODE_ENV === 'production') {

        //     const ipAddr = req.headers['X-Real-IP']


        //     const [resFastByIP, resSlowByIP] = await Promise.all([
        //         limiter.limiterFastBruteByIP.get(ipAddr),
        //         limiter.limiterSlowBruteByIP.get(ipAddr),
        //     ])

        //     let retrySecs = 0
        //     // Check if IP or Username + IP is already blocked
        //     if (resSlowByIP !== null && resSlowByIP.consumedPoints > limiter.maxWrongAttemptsByIPperDay) {
        //         retrySecs = Math.round(resSlowByIP.msBeforeNext / 1000) || 1
        //     } else if (resFastByIP !== null && resFastByIP.consumedPoints > limiter.maxWrongAttemptsByIPperMinute) {
        //         retrySecs = Math.round(resFastByIP.msBeforeNext / 1000) || 1;
        //       }
        //     if (retrySecs > 0) {
        //         const email = '1resUsernameAndIP: ' + resUsernameAndIP + '    ' + '2resSlowByIP: ' + ipAddr + '    ' + resSlowByIP + '    ' + '3relResUserName: ' + sanitizedEmail  
             
        //         await emailBloqueo(email)
        //         return done(null, false, { message: 'Bloqueado' })
        //     }
        //     else{
        //         const codigo = createRandomString(8)
        //         console.log('eeeeeeeooooooooooo')
        //         await guardarCodigoDB(sanitizedEmail, codigo)
        
        //         const confirmedEmail = await sendEmailCodigo({ email: sanitizedEmail, codigo }) //TODO crear en helpers, mirar api google
        //         // const confirmedEmail = 'done'
        
        //        if(confirmedEmail === 'done') return res.status(200).json({ message: 'succesfully sent email', email:sanitizedEmail })    
        //     }
        // }
        // else {
            const codigo = createRandomString(8)
        
            await guardarCodigoDB(sanitizedEmail, codigo)
    
            correoVerificacion.email = sanitizedEmail
            correoVerificacion.codigo = codigo

            const confirmedEmail = await sendEmailCodigo(correoVerificacion) 
    
           if(confirmedEmail === 'done') return res.status(200).json({ message: 'succesfully sent email', email:sanitizedEmail, realInput: email.toLowerCase() })    
       
        // }


    } catch (error) {
        debug('enviar correo verificacion')
        debug(error)
        res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
    }
}

async function enviarCorreoRecuperarContrasena(req, res) {
    try {
        const {email} = req.body
        
        let sanitizedEmail
        if (upmAccounts.includes(email.toLowerCase())) sanitizedEmail = email.toLowerCase() + '@upm.es'
        else sanitizedEmail = email.toLowerCase() + '@alumnos.upm.es'
        
console.log(sanitizedEmail,'sanitized emial')
        const existingUser = await verifyUserAlreadyExists(sanitizedEmail)
  
        if (!existingUser)  return res.status(400).json({ message: 'El usuario no existe' });
        
      
            const codigo = createRandomString(8)
        
            await guardarCodigoDB(sanitizedEmail, codigo)
    
            correoRecuperarContrasena.email = sanitizedEmail
            correoRecuperarContrasena.codigo = codigo

            const confirmedEmail = await sendEmailCodigo(correoRecuperarContrasena) 
       
           if(confirmedEmail === 'done') return res.status(200).json({ message: 'succesfully sent email', email:sanitizedEmail, realInput: email.toLowerCase() })    
   


    } catch (error) {
        debug('enviar correo verificacion')
        debug(error)
        res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
    }
}

async function guardarCodigoDB(email, codigo) {

    await knex('t_usuarios').update({codigo}).where({ email })
    
}

async function getCodigoFromDB(email) {

    return await knex('t_usuarios').first('codigo').where({ email })

}

async function verificarCodigo(req, res) {

 try {
    const { email, codigo} = req.body

    let sanitizedEmail
    if (upmAccounts.includes(email.toLowerCase())) sanitizedEmail = email.toLowerCase() + '@upm.es'
    else sanitizedEmail = email.toLowerCase() + '@alumnos.upm.es'
    

    const codigoDatabase = await getCodigoFromDB(sanitizedEmail)

    if (!codigoDatabase)  return res.status(400).json({ message: 'El usuario no existe' });
     
 
    if(codigoDatabase.codigo !== codigo) {
        return res.status(400).json({ message: 'Código incorrecto' })
    }
   else {
        await updateValidationStatus(sanitizedEmail)
        return res.status(200).json({ message: 'mail validated' })
   }
    
 } catch (error) {
     debug('verificacion codigos')
        debug(error)
        res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
 }
 
}


async function cambiarContrasena(req, res) {

    try {
        const { email, codigo, password} = req.body
    
        let sanitizedEmail
        if (upmAccounts.includes(email.toLowerCase())) sanitizedEmail = email.toLowerCase() + '@upm.es'
        else sanitizedEmail = email.toLowerCase() + '@alumnos.upm.es'
        
      
        const codigoDatabase = await getCodigoFromDB(sanitizedEmail)
    
        if (!codigoDatabase)  return res.status(400).json({ message: 'El usuario no existe' });
         
     
        if(codigoDatabase.codigo !== codigo) {
            return res.status(400).json({ message: 'Código incorrecto' })
        }
       else {
            const encryptedPassword = await encryptPassword(password)
            await cambiarContrasenaAlumno(sanitizedEmail, encryptedPassword)
            return res.status(200).json({ message: 'contrasena cambiada' })
       }
        
     } catch (error) {
         debug('cambiando contraseña error:')
            debug(error)
            res.status(500).json('Algo fue mal, vuelve a intentarlo más tarde!')
     }
}


async function cambiarContrasenaAlumno(email, password) {

    await knex('t_usuarios').update({password}).where({ email })
  
}

async function updateValidationStatus(email) {

    await knex('t_usuarios').update({validated: true}).where({ email })
  
}




module.exports = {
    authenticateUser,
    signupNewUser,
    enviarCorreoVerificacion,
    enviarCorreoRecuperarContrasena,
    verificarCodigo,
    cambiarContrasena

};
