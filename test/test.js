window.onload=function(){
    console.log("Onload");
    var target = document.getElementById("foo");
    target.innerText = "Hello World";
    target = document.getElementById("bar");
    var canvas = document.createElement('canvas');
    target.appendChild(canvas);
    var ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(50,50);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(50,50);
        ctx.lineTo(0,50);
        ctx.setLineDash([5]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0,50);
        ctx.setLineDash([]);
        ctx.lineTo(50,100);
        ctx.stroke();
};