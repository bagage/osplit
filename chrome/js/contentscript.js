'use strict';
var regex = /OE20\d\d © Stephan Krämer 20\d\d/;
String.prototype.trim = String.prototype.trim || function() {
    return this.replace(/^\s+|\s+$/g, '');
};
var CIRCUITS;
var PARENT;
var OURDIV;
var BACKUP;
function onIconClicked() {
    if (OURDIV) {
        PARENT.removeChild(OURDIV);
        PARENT.appendChild(BACKUP);
        OURDIV = null;
    }
    else {
        PARENT.removeChild(BACKUP);
        OURDIV = document.createElement('div');
        for (var i = 0; i < CIRCUITS.length; i++) {
            var c = CIRCUITS[i];
            var table = document.createElement('table');
          
            table.createCaption().innerText = c.description;
            var tbody = table.createTBody();
            for ( var r = 0; r < c.runners.length; r++){
                var runner = c.runners[r];
                var tr = document.createElement('tr');
                tbody.appendChild(tr);
                for ( var t = 0; t < runner.cumTimes.length; t++){
                    var td = document.createElement('td');
                    td.innerText = runner.cumTimes[t];
                    tr.appendChild(td);
                }
            }
            OURDIV.appendChild(table);
        }
        PARENT.appendChild(OURDIV);
    }

}

function Circuit() {
}
var RE_CIRCUIT = /[A-Z]\s+\(\d+\)\s+[\d\.]+\skm\s+\d+\s+P\s*/;
var headline = {};
if (regex.test(document.body.innerText)) {
    CIRCUITS = parseDocument();
    chrome.extension.sendMessage({}, function(response) {
        chrome.runtime.onMessage.addListener(onIconClicked);
    });
}
function parseDocument() {
    BACKUP = document.getElementsByTagName('pre')[0];
    PARENT = BACKUP.parentElement;
    var fullText = BACKUP.innerText;
    var lines = fullText.split(/\n/);
    var head = lines.shift();
    var allCircuits = [];
    headline.rank = head.indexOf('Pl');
    headline.name = head.indexOf('Nom');
    headline.category = head.indexOf('Cat.');
    headline.time = head.indexOf('Temps') - '3:59:59'.length;
    headline.data = head.indexOf('Temps') + 'Temps'.length;
    
    dropNonCircuit(lines);
    while(lines.length > 0) {
        var circuit = getOneCircuit(lines);
        allCircuits.push(circuit);
        dropNonCircuit(lines);
    }
    return allCircuits;
}

function dropNonCircuit(lines) {
    var line;
    do {
        line = lines.shift();
    } while(line !== undefined && !line.match(RE_CIRCUIT));
    if (line !== undefined) {
        lines.unshift(line);
    }
}

function getOneCircuit(lines) {
    var line;
    var circuit = new Circuit();
    circuit.description = lines.shift();
    circuit.controls = [];
    circuit.runners = [];
    circuit.controlLinesCount = 0;
    var controls = "";
    do {
        line = lines.shift();
        if (line) {
            controls += line;
            circuit.controlLinesCount++;
        }
    } while(line);
    var tmpResultsArr;
    var reControls = /(\d+)\((\d+)\)/g;
    while ((tmpResultsArr = reControls.exec(controls)) !== null) {
        var controlNumber = tmpResultsArr[1];
        var controlId = tmpResultsArr[2];
        circuit.controls.push({n:controlNumber, id:controlId});
    }
    circuit.controls.push({n:'A', id:'A'});
    // skip empty line(s)
    do {
        line = lines.shift();
    } while(!line);
    lines.unshift(line);
    // Read runners
    var runner;
    do {
        runner = getOneRunner(circuit.controlLinesCount, lines);
        if (runner) {
            circuit.runners.push(runner);
        }
    } while(runner);
    return circuit;
}
function getOneRunner(controlLinesCount, lines) {
    var line1 = lines.shift();
    if (!line1) {
        return undefined;
    }
    var line2 = lines.shift();
    var runner = {};
    runner.rank = line1.slice(headline.rank, headline.name - 1).trim();
    runner.name = line1.slice(headline.name, headline.category - 1).trim();
    runner.category = line1.slice(headline.category, headline.time - 1).trim();
    runner.totalTime = line1.slice(headline.time, headline.data - 1).trim();

    lines.unshift(line2);
    lines.unshift(line1);
    
    var totals = "";
    var legs   = "";
    var line;
    for (var i=0; i < 2*controlLinesCount; i+=2) {
        line = lines.shift();
        line = line.slice(headline.data);
        totals += line;
        line = lines.shift();
        line = line.slice(headline.data);
        legs += line;
    }
    runner.cumTimes = totals.trim().split(/\s+/);
    runner.legTimes = legs.trim().split(/\s+/);
    return runner;
}
