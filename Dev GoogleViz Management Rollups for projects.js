<div id="prjList">
	<div style="margin-top:160px; text-align:center">
		<img src = "http://teams.gsg.sa.gov.au/ict/be/bussol/Projects/SiteAssets/loading.gif" />
	</div>
</div>
<div id="prjPopUp" style="display:none;">
</div>
<div id="prjFilter" style="display:none;">
</div>

<!-- LOAD JQUERY -->
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js"></script>

<!-- AND JQUERY UI -->
<link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css">
<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js"></script>

<!-- LOAD GOOGLE VISUALISATION API -->
<script type='text/javascript' src='https://www.google.com/jsapi'></script>

<!-- LOAD MINUTE.JS - DATE MANIPULATION -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.12.0/moment.js"></script>

<script>
var siteList = new Array();
var portVal={proj:0,current:0,baseline:0};
var filters = new Object();
var selFilters = new Object();
var init = true;

// LOAD THE GOOGLE VIZ TABLE PACKAGE
google.load('visualization', '1', {packages:['table']});

$(document).ready(function(){
	var prRootSiteURI = "http://teams.gsg.sa.gov.au/ict/be/bussol/Projects/";
	prRootSiteURI += "_api/Web/Lists/GetByTitle('ICT Project Dashboard')/items"

	// First, lets get all the subsites
	$.ajax({
		url:prRootSiteURI,
		headers:{"Accept": "application/json;odata=verbose"}
	}).done(function(data){
		var siteData = data.d.results; //All projects from the master projects list

		// Keep this simple --> First Pass, build the siteList array of Project Objects
		$(siteData).each(function(){
			var hrRpt = this.Highlight_x0020_Report||{Description:"TBA",Url:"/Projects/TBA/TBA"}; // fix for crash when a list entry is first created but no site exists
			var prj = new Project(hrRpt.Description, hrRpt.Description, hrRpt.Url.match(/.+Projects\/[^\/]+/)[0], this.GUID, this.Hide);
			siteList.push(prj);
		});

		// second Pass - iterate through the siteList array and lookup the highlight reports
		$(siteList).each(function(ptr){
			var hiURL = this.url + "/_api/Web/Lists/GetByTitle('Highlight Reports')/items"
			$.ajax({
				url:hiURL,
				headers:{"Accept": "application/json;odata=verbose"}
			}).done(function(data){
				var rptData = data.d.results;
				var cSite = siteList[ptr];
				var idx = rptData.length-1;
				if (idx == -1) {return;} // Bomb out if no records
				var cRpt = rptData[idx];
				cSite.rptURI = hiURL;
				cSite.stage=retValidStr(cRpt.Stage);
				cSite.pct=retValidNo(cRpt.Percent);
				cSite.health=retValidStr(cRpt.Pr_Health);
				cSite.marval=retValidStr(cRpt.Marval);
				cSite.apEnd =  cRpt.End_x0020_Date;
				cSite.foreEnd = cRpt.Forcast_x0020_End_x0020_Date;
				cSite.startDate = cRpt.Start_x0020_Date;

				var rTot=0;
				for (var i=1;i<8;i++){rTot+=retValidNo(cRpt["bt_x002d_f" + i])}
				cSite.fSpend = rTot;

				var rTot=0;
				for (var i=1;i<8;i++){rTot+=retValidNo(cRpt["bt_x002d_b" + i])}
				cSite.baseline = rTot;

				var rTot=0;
				for (var i=1;i<8;i++){rTot+=retValidNo(cRpt["bt_x002d_s" + i])}
				cSite.current = rTot;

				cSite.period=retValidStr(cRpt.Reporting_x0020_Period);
				cSite.pm = retValidNo(cRpt.Project_x0020_ManagerId);
				cSite.sponsor = retValidNo(cRpt.SponsorId);
				cSite.summary = retValidStr(cRpt.Executive_x0020_Summary);
				if (cRpt.Marval_x0020__x0023_){
					cSite.marvURI = retValidStr(cRpt.Marval_x0020__x0023_.Url);
				} else {
					cSite.marvURI = "-";
				}
				
				siteList[ptr]=cSite
				portVal.proj += cSite.fSpend;
				portVal.baseline += cSite.baseline;
				portVal.current += cSite.current;



				//Finally 
				updatePeople(ptr);
			});
		});
	});
	$(document).ajaxStop(function(){
		if(init){
			siteList.sort(function(a, b){
				var stageA=a.stage.toLowerCase(), stageB=b.stage.toLowerCase()
				if (stageA < stageB) //sort string ascending
					return -1 
				if (stageA > stageB)
					return 1
				return 0 //default return value (no sorting)
				});
			filters = getFilters(siteList);
			selFilters.stages = initStageFilters();
			selFilters.status = filters.status;
			makeProjectTable(siteList, selFilters);
			init=false;
		}
	});

	$("#btnFilter").on("click", function(){
		var stageSelectDiv = $("<div>")
			.css({"float":"left",
				"border":"solid 1px #eee",
				"padding":"0px 10px"
				})
			.text("Stages")
			.append("<br />");

		$(filters.stages).each(function(i, stageLable){
			var stageCB = $("<input />");
			if ($.inArray(stageLable, selFilters.stages)!=-1){
				stageCB.attr({"value":stageLable, "checked":"checked", "name":"selStage", "type":"checkbox"});
			} else {
				stageCB.attr({"value":stageLable, "name":"selStage", "type":"checkbox"});
			}
			$(stageSelectDiv).append(stageCB)
				.append($("<span>")
				.text(function(){
					if (stageLable == ""){
						return "[Blank]";
					} else {
						return stageLable;
					}
				}()))
				.append("<br />");
			
		});

		var statusSelectDiv = $("<div>")
			.css({"float":"right",
				"border":"solid 1px #eee",
				"padding":"0px 10px"
				})
			.text("Status")
			.append("<br />");

		$(filters.status).each(function(i, statusLable){
			var statusCB = $("<input />")

			if ($.inArray(statusLable, selFilters.status)!=-1){
				statusCB.attr({"value":statusLable, "checked":"checked", "name":"selStatus", "type":"checkbox"});
			} else {
				statusCB.attr({"value":statusLable, "name":"selStatus", "type":"checkbox"});
			}

			$(statusSelectDiv).append(statusCB)
				.append($("<span>")
				.text(function(){
					if (statusLable == ""){
						return "[Blank]";
					} else {
						return statusLable;
					}
				}()))
				.append("<br />");
			
		});


		$("#prjFilter").empty();
		$("#prjFilter").append(stageSelectDiv);
		$("#prjFilter").append(statusSelectDiv);

		$("#prjFilter").append("<br clear='all'>");
		$("#prjFilter").append($("<button>")
			.attr({"type":"button", "id":"btnApplyFilter"})
			.text("Apply Filter")
			.css({"font-size":".8em","display":"inline-block","float":"left"})
			.on("click", function(){
				selFilters.stages = [];
				$("#prjFilter input:checked[name='selStage']").each(function(){
					selFilters.stages.push($(this).val());
					});
				selFilters.status = [];
				$("#prjFilter input:checked[name='selStatus']").each(function(){
					selFilters.status.push($(this).val());
					});
				makeProjectTable(siteList, selFilters);
				$("#prjFilter").dialog("close");
				})
			);
		$("#prjFilter").append($("<a>")
				.text("Revert to default view")
				.attr({"href":"#"})
				.css({"font-size":".8em","display":"inline-block","float":"right","margin-top":"10px"})
				.on("click",function(){
					selFilters.stages = initStageFilters();
					selFilters.status = filters.status;
					makeProjectTable(siteList, selFilters);
					$("#prjFilter").dialog("close");
				})
			);

		$("#prjFilter").dialog({
			title:"Apply Filter",
			modal:true,
			width:330,
			height:"auto"
		});


	});

});

function updatePeople(ptr){
	// PM
	if ( siteList[ptr].pm ){
		var uri = "http://teams.gsg.sa.gov.au/ict/be/bussol/Projects/_api/Web/GetUserById(" + siteList[ptr].pm +")";
		$.ajax({
			url:uri,
			headers:{"Accept": "application/json;odata=verbose"}
		}).done(function(data){
			user = data.d;
			siteList[ptr].pm = user.Title;

		});
	}

	if ( siteList[ptr].sponsor ){
		uri = "http://teams.gsg.sa.gov.au/ict/be/bussol/Projects/_api/Web/GetUserById(" + siteList[ptr].sponsor +")";
		$.ajax({
			url:uri,
			headers:{"Accept": "application/json;odata=verbose"}
		}).done(function(data){
			user = data.d;
			siteList[ptr].sponsor = user.Title;

		});
	}
}

function makeProjectTable(portfolio, currFilterSet){
	// Now, build the table headings *************************

	var data = new google.visualization.DataTable();
	data.addColumn('string', 'ID');
	data.addColumn('string', 'Project');
	data.addColumn('string', 'PM');
	data.addColumn('string', 'Sponsor');
	data.addColumn('string', 'Status');
	data.addColumn('string', 'Stage');
	data.addColumn('number', 'Complete');
	data.addColumn('string', 'Reporting Period');
	data.addColumn('number', 'Budget$');
	data.addColumn('number', 'Current$');
	data.addColumn('number', 'Forecast$');
	data.addColumn('number', 'Uncommitted$');
	data.addColumn('date', 'Start Date');
	data.addColumn('date', 'Approved End');
	data.addColumn('date', 'Forecast End');
	data.addColumn('number', 'Variance (days)');
	// columns to be hidden
	data.addColumn('string', 'Summary');
	data.addColumn('string', 'MarvURI');
	data.addColumn('string', 'ReportsURI');

	// *******************************************************

	// Now, build a dataset for the table  ***

	var tableData = [];
	$(portfolio).each(function(){
		if (!this.hidden && $.inArray(this.stage, currFilterSet.stages) !=-1 && $.inArray(this.health, currFilterSet.status) !=-1){
			var base = parseInt(this.baseline);
			var curr = parseInt(this.current);
			var fSpend = parseInt(this.fSpend);
			var outSt = parseInt(this.fSpend - this.current);
			tableData.push([
				{v:this.url, f:this.marval},
				this.title,
				this.pm,
				this.sponsor,
				this.health,
				this.stage,
				{v:this.pct, f:this.pct + "%"},
				this.period.toString(),
				{v:base, f:"$" + base},
				{v:curr, f:"$" + curr},
				{v:fSpend, f:"$" + fSpend},
				{v:outSt, f:"$" + (outSt)},
				getSPDate(this.startDate),
				getSPDate(this.apEnd),
				getSPDate(this.foreEnd),
				dateDiff(this.apEnd, this.foreEnd),
				this.summary,
				this.marvURI,
				this.rptURI
			]);
		}
	});


	data.addRows(tableData);
	// *******************************************************

	// Create a dataview object that we can manipulate
	var view = new google.visualization.DataView(data);
	view.hideColumns([16,17,18]);
	//view.hideColumns([8]);

	// ******************************************************


	// and draw the table ************************************
	var options = {
		showRowNumber: false,
		allowHtml: true
	}

	var table = new google.visualization.Table(document.getElementById('prjList'));

	// fine-tune the visualisation
	google.visualization.events.addListener(table, 'ready', function () {
		setColWidths()
    });

	google.visualization.events.addListener(table, 'sort', function () {
		setColWidths()
    });

	table.draw(view, options);
	google.visualization.events.addListener(table, 'select', function(e){

		$("#prjPopUp").empty();
		var pTitle = data.getValue(table.getSelection()[0].row, 1);
		var pURI = data.getValue(table.getSelection()[0].row, 0);
		var pSummary = data.getValue(table.getSelection()[0].row, 16);
		var pMarv = data.getValue(table.getSelection()[0].row, 17);
		var pReports = data.getValue(table.getSelection()[0].row, 18);
		prjSummary = $("<div>")
			.html(pSummary)
			.attr({"id":"prjSummary"})
			.append("<hr />");
		prjHrLink = $("<div>")
			.attr({"id":"prjHrLink"})
			.css({"margin-top":"1em"})
			.html("Project Home&nbsp;")
			.append("<a href='" + pURI + "' target='_blank'>click here</a>");
		prjMarvLink = $("<div>")
			.attr({"id":"prjMarvLink"})
			.css({"margin-top":"1em"})
			.html("Marval job&nbsp;")
			.append("<a href='" + pMarv + "' target='_blank'>click here</a>");

		$("#prjPopUp")
			.append(prjSummary)
			.append(prjHrLink)
			.append(prjMarvLink);

		makePopUp(pTitle);
		doHistory(pReports);
		//window.open(data.getValue(table.getSelection()[0].row, 0),data.getValue(table.getSelection()[0].row, 0));
	});





	// *******************************************************

	function setColWidths(){
		// Set column width minimums
        var colWidths = [
        	{heading:"Stage", minWidth:"8em"},
        	{heading:"Start Date", minWidth:"7em"},
        	{heading:"Approved End", minWidth:"7em"},
        	{heading:"Forecast End", minWidth:"7em"},
        	{heading:"Status", minWidth:"5em"}
        	];
        $(colWidths).each(function(){
        	$("#prjList .google-visualization-table-th:contains('" + this.heading + "')").css('min-width', this.minWidth);
        });
	}
}

function retValidNo(field){
	if (typeof(field)=="undefined" || isNaN(field)){
		return 0;
	} else {
		return field;
	}
}

function retValidStr(field){
	if (typeof(field)=="undefined"||field === null){
		return "-";
	} else {
		return field.toString();
	}
}

function toCurrency(a){
	return a.toFixed(2).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}

function Project(t,d,u,i,h){
	this.title = retValidStr(t);
	this.desc = retValidStr(d);
	this.url = retValidStr(u);
	this.id = retValidStr(i);
	this.stage="";
	this.pct=0;
	this.health = "";
	this.marval="";
	this.baseline = 0;
	this.current = 0;
	this.fSpend = 0;
	this.period = 0;
	this.hidden = h;
}

function getSPDate(field){
	var d = new moment(field);
	if (d.isValid()){
		return new Date(d);
	} else {
		return null;
	}
}

function dateDiff(firstDate, secondDate){
	var d1 = new moment(firstDate);
	var d2 = new moment(secondDate);
	if (d1.isValid()&&d2.isValid()){
		return d2.diff(d1, 'days');
	} else {
		return null;
	}
}

function makePopUp(pTitle){

	$("#prjPopUp").dialog({
		title:pTitle,
		modal:true,
		width:600
	})
}

function byStage(a,b) {
 return a.stage>b.stage;
}

function doHistory(uri){
	var pDuration = new Array();
	var pCost = new Array();
	var pGantt = new Array();
	$.ajax({
		uri:uri,
		headers:{"Accept": "application/json;odata=verbose"}
		}).done(function(data){
			var rptData = data.d.results;
			$(rptData).each(function(){
				
			});
		});
}

function getFilters(siteList){
	var filters = new Object();
	filters.stages = new Array();
	filters.status = new Array();
	$(siteList).each(function(){
		if ($.inArray(this.stage, filters.stages)==-1){
			filters.stages.push(this.stage);
		}
		if ($.inArray(this.health, filters.status)==-1){
			filters.status.push(this.health);
		}
	});
	filters.stages.sort();
	filters.status.sort();
	return filters;
}

function initStageFilters(){
	var stageFilters = [
		"1. Start-up",
		"2. Planning",
		"3. Implementation",
		"4. Close"
	];

	return stageFilters;
}
</script>
