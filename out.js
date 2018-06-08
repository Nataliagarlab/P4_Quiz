
const figlet = require('figlet');
const chalk = require('chalk');
const readline = require('readline');
const Sequelize = require('sequelize');


const colorize = (msg, color) => {
	if(typeof color !== "undefined"){
		msg = chalk[color].bold(msg);
	}
	return msg;
};

const log = (socket, msg, color) => {
	socket.write(colorize(msg, color));
};

const biglog = (socket, msg, color) => {
	log(socket, figlet.textSync(msg, {horizontalLayout : 'full'}), color);
};

const errorlog = (socket, emsg) => {
	socket.log(`${colorize('Error','red')} : ${colorize(emsg, "red")}` );
};


exports = module.exports ={
	colorize,
	log,
	biglog,
	errorlog
};
