const {models} = require('./model');
const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require('./out');
//const readline = require('readline');


exports.helpCmd = (socket,rl) => {
		log(socket,"Comandos:");
		log(socket, "h|help - Muestra esta ayuda");
		log(socket, "List - Listar los quizzes existentes.");
		log(socket, "show <id> - Muestra la pregunta y la respuesta del quiz indicado");
		log(socket, "add - Añadir un nuevo quiz interactivamente");
		log(socket, "delete <id> - Borrar el quiz indicado");
		log(socket, "edit <id> - Editar el quiz indicado");
		log(socket, "test <id> - Probar el quiz indicado");
		log(socket, " p|play - Jugar a preguntar aleatoriamente todos los quizzes");
		log(socket, "credits - Créditos");
		log(socket, "q|quit - Salir del programa");
		rl.prompt();
};

exports.addCmd = (socket, rl) => {

		makeQuestion(socket, rl, 'Introduzca una pregunta')
		.then(q => {
			return makeQuestion(rl, 'Introduzca la respuesta')
			.then(a =>{
				return {question: q, answer : a};
			});
		})
		.then( quiz => {
			return models.quiz.create(quiz);
		})
		.then((quiz)=> {
			log(socket,`[${colorize('Se ha añadido','magenta')}]: ${quiz.question} ${colorize('=>','magenta')}${quiz.answer}`);
		})
		.catch(Sequelize.ValidationError, error =>{
			errorlog(socket,'El quiz es erroneo:');
			error.errors.forEach(({message})=> errorlog(socket, message));
		})
		.catch(error=>{
			errorlog(socket,error.message);
		})
		.then(() =>{
			rl.prompt();
		});
	};


exports.editCmd =(socket,rl,id) => {
		validateId(id)
		.then(id=> models.quiz.findById(id))
		.then(quiz => {
			if(!quiz){
				throw new Error(`No existe quiz con ${id} de id`);
				}
				process.stdout.isTTY && setTimeout( () => {rl.write(id.question)},0);
				return makeQuestion(socket, rl, '¿Respuesta?')
				.then(q=>{
					process.stdout.isTTY && setTimeout( () => {rl.write(id.answer)},0);
					return makeQuestion(socket, rl, `¿Respuesta?`)
					.then(a=> {
						quiz.question = q;
						quiz.answer = a;
						return quiz;
					});
				});
		})
		.then(quiz => {
			return quiz.save();
		})
		.then(quiz =>{
			log(socket, `Se ha cambiado ${colorize(quiz.id,'magenta')}, por: ${quiz.question}$(colorize'=>', 'magenta')}${quiz.answer}`);
		})
		.catch(Sequelize.ValidationError, error =>{
			errorlog(socket, 'Error en quiz');
			error.errors.forEach(({message})=> errorlog(socket, message));
		})
		.catch(error=>{
			errorlog(socket,error.message);
		})
		.then(()=>{
			rl.prompt();
		});
				
};

exports.quitCmd = (socket,rl) => {
		rl.close();
		socket.end();

};

exports.listCmd = (socket, rl) => {
	models.quiz.findAll()
	.each(quiz => {
		log(socket,`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
		})
	.catch(error=>{
		errorlog(socket, error.message);
	})
	.then(()=> {
		rl.prompt();
	});
};


const validateId = (id) => {
	return new Sequelize.Promise((resolve, reject)=>{
		if(typeof id === "undefined"){
			reject(new Error(`Falta el parámetro <id>.`));
		}else{
			id = parseInt(id);
			if(Number.isNaN(id)){
				reject(new Error(`El valor del parametro <id> no es un numero.`));
			}else{
				resolve(id);
			}
		}
	});
};

exports.showCmd = (socket, rl,id)  => {

		validateId(id)
		.then(id => models.quiz.findById(id))
		.then(quiz => {
			if(!quiz){
				throw new Error(`No existe un quiz asociado al id = ${id}`);
			}
			log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
		})
		.catch(error=> {
			errorlog(socket, error.message);
		})
		.then(()=> {
			rl.prompt();
		});
	};


const makeQuestion = (socket, rl, text)=> {
	return new Sequelize.Promise((resolve, reject)=> {
		rl.question(colorize(text,  'red'), answer =>{
			resolve(answer.trim());
		});
	});
};

exports.testCmd = (socket, rl,id)  => {
		
		validateId(id)
		.then(id=> models.quiz.findById(id))
		.then(quiz=>{
			if(!quiz){
				throw new Error('No existe quiz con id ${id}');
			}
	
		return makeQuestion(socket, rl, '¿Respuesta:')
		.then( a=> {
					if(a.toLowerCase().trim() === quiz.answer.toLowerCase()){
							log(socket, 'Respuesta CORRECTA');
					} else {
							log(socket, 'Respuesta INCORRECTA');
					}
				});
		})
		.catch(error=>{
				errorlog(socket, error.message);
		})
		.then(()=>{
			rl.prompt();
		});

};

exports.playCmd = (socket, rl) => {

		var puntos = 0;
		var toBeResolved = [];
		var Questions = 0;

	models.quiz.findAll()
		.each(quiz=>{
			Questions++;
			toBeResolved.length = Questions;
			toBeResolved.push(quiz.id);
			})
	 .then(()=>{
		if(toBeResolved.length === 0 ){
			log(socket,'No quedan más preguntas','red');
		} else{
			playOne();
		}
	})
	.catch(error=>{
		errorlog(socket,error.message);
	})
	.then(()=>{
		rl.prompt();
	});

		const playOne =()=> {
			var restantes =Questions - puntos;
			var id = Math.floor(Math.random()*(Questions-puntos));
			validateId(id);
			models.quiz.findById(toBeResolved[id])
			.then(quiz=> {
				log(socket,`Pregunta: ${quiz.question}`);
				return makeQuestion(rl, '¿Respuesta?')
					.then(a=> {
						if(a.toLowerCase().trim()=== quiz.answer.toLowerCase()){
							puntos++;
							log(socket,`CORRECTA, lleva ${puntos} puntos`,'green');
								if(puntos < Questions){
								toBeResolved.splice(id,1);
								models.quiz.findById(id)
								.then(()=>{
									rl.prompt();
								})
								.then(()=>{
									playOne();
								});
								} else{
									log(socket,'HAS GANADO');
								}
						}else{
							log(socket,'INCORRECTA');
							log(socket,`Has acertado ${puntos} preguntas`);
						}
					})
			.catch(error =>{
				errorlog(socket,error.message);
			});
		})
			.catch(error=>{
					errorlog(socket,error.message);
			})

			.then(()=>{
				rl.prompt();
			});
		};	
};

exports.deleteCmd = (socket, rl, id)  => {
	validateId(id)
	.then(id=> models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(socket,error.message);
	})		
	.then(()=>{
		rl.prompt();
	});

};
exports.creditsCmd = (socket,rl) => {
		log(socket,'Autor de la práctica');
		log(socket, 'NATALIA');
		//log(socket, 'IGNACIO');
		rl.prompt();
};
