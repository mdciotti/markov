
var util = require('util');

var Markov = (function (global) {

	// PRIVATE MEMBERS

	var EPSILON = 1e-10;

	// CONSTRUCTOR

	function Markov() {
		this.transitionMatrix = [];	
		this.state = null;
		this.states = [];
	}

	// PRIVATE METHODS

	var getID = function (name) {
		return this.states.indexOf(name);
	};

	var isState = function (name) {
		return this.states.indexOf(name) >= 0;
	};

	var expandMatrix = function (val) {
		var max = this.transitionMatrix.length;

		// Add bottom row
		this.transitionMatrix[max] = [];
		for (var i = 0; i <= max; i++) {
			this.transitionMatrix[max][i] = val;
		}

		// Add last column
		for (var i = 0; i <= max; i++) {
			this.transitionMatrix[i][max] = val
		}
	};

	var removeRow = function (r) {
		this.transitionMatrix.splice(r, 1);
	};

	var removeCol = function (c) {
		var r = this.transitionMatrix.length;

		for (var i = 0; i < r; i++) {
			this.transitionMatrix[i].splice(c, 1);
		}
	};

	var isValidRow = function (row) {
		var sum = row.reduce(function (c, s) {
			return s + c;
		}, 0);

		return Math.abs(1 - sum) < EPSILON;
		// return sum <= 1;
	};

	var createMatrix = function (n, fill) {
		var i, j,
			mat = [],
			row;

		for (i = 0; i < n; i++) {
			row = [];
			for (j = 0; j < n; j++) {
				row.push(fill);
			}
			mat.push(row);
		}
		return mat;
	};

	var sumList = function (list) {
		return list.reduce(function (el, s) {
			return s + el;
		}, 0);
	};

	// PUBLIC METHODS

	Markov.prototype.addState = function (name) {
		if (isState.call(this, name)) {
			throw new Error("State '" + name + "' already exists!");
			return;
		}
		this.states.push(name);

		expandMatrix.call(this, 0);
	};

	Markov.prototype.deleteState = function (name) {
		if (!isState.call(this, name)) {
			throw new Error("State '" + name + "' doesn't exist!");
			return;
		}

		var id = getID.call(this, name);

		removeRow.call(this, id);
		removeCol.call(this, id);

		this.states.splice(id, 1);
	};

	Markov.prototype.setTransition = function (s1, s2, val) {
		if (!isState.call(this, s1)) {
			throw new Error("'" + s1 + "' is not a defined state!");
			return;
		}
		if (!isState.call(this, s2)) {
			throw new Error("'" + s2 + "' is not a defined state!");
			return;
		}

		var r = getID.call(this, s1);
		var c = getID.call(this, s2);

		var temp = this.transitionMatrix[r][c];

		this.transitionMatrix[r][c] = val;

		// if (!isValidRow(this.transitionMatrix[r])) {
		// 	throw new Error("Invalid row (sum must equal 1)");
		// 	console.log(util.inspect(this.transitionMatrix[r]));
		// 	this.transitionMatrix[r][c] = temp;
		// 	return;
		// }
	};

	Markov.prototype.setState = function (name) {
		this.state = name;
	};

	Markov.prototype.getState = function () {
		return this.state;
	};

	Markov.prototype.step = function () {
		if (!isState.call(this, this.state)) {
			throw new Error("'" + this.state + "' is not a defined state!");
			return;
		}

		var rand = Math.random();
		var r = getID.call(this, this.state);
		var max = this.transitionMatrix[r].length;
		var sum = 0;

		for (var c = 0; c < max; c++) {
			sum += this.transitionMatrix[r][c];
			if (rand < sum) {
				this.state = this.states[c];
				return this.state;
			}
		}
	};

	Markov.prototype.normalize = function () {
		var rows = this.transitionMatrix.length,
			sum;

		this.transitionMatrix = this.transitionMatrix.map(function (row) {
			sum = sumList(row);
			return row.map(function (el) {
				return el / sum;
			});
		});
	};

	Markov.prototype.train = function (sample) {
		var i,
			t,
			l = sample.length,
			tokens = [],
			s0,
			s1,
			temp,
			transitionCounts;

		// Count unique states
		for (i = 0; i < l; i++) {
			t = sample[i];
			if (tokens.indexOf(t) < 0) {
				tokens.push(t);
			}
		}

		// Create transition count matrix (filled with 0)
		this.transitionMatrix = createMatrix(tokens.length, 0);

		s0 = sample[0];
		s1 = sample[1];

		// Tally transition counts
		for (i = 1; i < l; i++) {
			temp = s1;
			s1 = sample[i];
			s0 = temp;

			this.transitionMatrix[tokens.indexOf(s0)][tokens.indexOf(s1)]++;
		}
		this.states = tokens;
		this.normalize();
	};

	var mimicSort = function (example) {
		return function (a, b) {
			return example.indexOf(a) > example.indexOf(b);
		};
	};

	var transpose = function (A) {
		var N = A.length,
			temp;

		for (var n = 0; n < N - 1; n++) {
			for (var m = n + 1; m < N; m++) {
				temp = A[n][m];
				A[n][m] = A[m][n];
				A[m][n] = temp;
			}
		}
		return A;
	};

	Markov.prototype.sort = function (example) {
		var mimic = mimicSort(example);
		this.states.sort(mimic);
		this.transitionMatrix.sort(mimic);
		var T = transpose(this.transitionMatrix).sort(mimic);
		this.transitionMatrix = transpose(T);
	};

	Markov.prototype.toString = function () {

		var states = this.states;

		var str = "\t" + states.join("\t");

		this.transitionMatrix.forEach(function (row, i) {
			str += "\n" + states[i];
			row.forEach(function (el) {
				str += "\t" + el.toFixed(3);
			});
		});
		return str;
	};

	return Markov;

})(this);

function chiSquare(observed, expected) {
	var obs = observed.join().split(',');
	return expected.join().split(',').map(function (exp, i) {
		return Math.pow(obs[i] - exp, 2) / exp;
	}).reduce(function (el, s) {
		return el + s;
	}, 0);
}

var m = new Markov();
var history = [];

m.addState("R");
m.addState("C");
m.addState("S");

m.setTransition("R", "R", 0.2);
m.setTransition("R", "C", 0.3);
m.setTransition("R", "S", 0.5);

m.setTransition("C", "R", 0.2);
m.setTransition("C", "C", 0.5);
m.setTransition("C", "S", 0.3);

m.setTransition("S", "R", 0.1);
m.setTransition("S", "C", 0.3);
m.setTransition("S", "S", 0.6);

m.setState("S");

history.push("S");

// console.log(util.inspect(m));

while (history.length <= 10) {
	history.push(m.step());
}
// console.log(util.inspect(history.join('')));

var m2 = new Markov();
m2.train(history);
console.log(m.toString());
console.log(m2.toString());
// console.log(chiSquare(m2.transitionMatrix, m.transitionMatrix));
// m2.sort(m.states);
// console.log(m2.toString());

// var m3 = new Markov();
// m3.train("AABB".split(''));
// console.log(m3.toString());

/*
From a population of transitions between states of weather, 
*/

// Sort

// function SRS(pool, n) {
// 	var sample = [],
// 		size = pool.length;

// 	while (sample.length < n) {
// 		sample.push(pool[Math.floor(Math.random() * size)]);
// 	}
// 	return sample;
// }

// var nobility = ["Viceroy", "Archduke", "Grand-Duke", "Duke", "Marquess", "Marquis", "Margrave", "Count", "Earl", "Viscount", "Baron", "Baronet", "Knight", "Vassal", "Armiger", "Gentry"];
// var sample = SRS(nobility, 4);

// console.log(sample.join(" "));
// console.log(mimicSort(nobility, sample).join(" "));

// function mimicSort(example, arr) {
// 	return arr.sort(function (a, b) {
// 		return example.indexOf(a) > example.indexOf(b);
// 	});
// }
