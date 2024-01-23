
let results = [];
let error = "";
let total_count = 0;
let current_count = 0;
let pages = [];

function get_results(different_doc) {
    let ratings_nodelist = different_doc.querySelectorAll(".rating");
    let name = different_doc.querySelectorAll(".description")[0].innerHTML;
    let players = different_doc.querySelectorAll(".description")[1].innerHTML;
    let time = different_doc.querySelectorAll(".description")[2].innerHTML;
    let points = different_doc.querySelectorAll(".description")[3].innerHTML;
    let started = different_doc.querySelectorAll(".description")[4].innerHTML;
    let result = {};

    for (let rating_node of ratings_nodelist) {
        let category = (rating_node.parentNode.querySelector(".right").innerHTML);
        let rating = 0 + rating_node.querySelectorAll(".star").length + 0.5 * rating_node.querySelectorAll(".star-half").length;
        result[category] = rating;
    }
    results.push({ "name": name, "ratings": result, "players": players, "time": time, "points": points, "started": started });
    console.log("got results");
}


let retries = {};

async function get_page(url, sendResponse) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10000));

    await fetch(url).then(response => response.text()).then(text => {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(text, "text/html");
        current_count += 1;
        chrome.runtime.sendMessage({status: "progress", current: current_count, total: total_count});

        get_results(parsed);
    }).catch(err => {
        if(retries[url]) {
            retries[url] += 1;
        }  else {
            retries[url] = 1;
        }
        if(retries[url] < 5) {
            pages.push(get_page(url));
        } else {
            error = err.message;
        }
    });
}

function get_csv(res) {
    let csv = "";
    let titles = Object.keys(res[0]);
    for(let title of titles) {
        if(title === "ratings") {
            for(let rating of Object.keys(res[0][title])) {
                csv += rating + ";";
            }
            continue;
        } else {
            csv += title + ";";
        }
    }
    csv += "\n";
    for(let r of res) {
        for(let title of titles) {
            if(title === "ratings") {
                for(let rating of Object.values(r[title])) {
                    csv += rating + ";";
                }
                continue;
            } else {
                csv += r[title] + ";";
            }
        }
        csv += "\n";
    }

    console.log(csv);

    return csv;
}

function get_xlsx(res) {
    let rows = [];
    rows.push([]);
    let titles = Object.keys(res[0]);
    for(let title of titles) {
        if(title === "ratings") {
            for(let rating of Object.keys(res[0][title])) {
                rows[0].push({value: rating, fontWeight: 'bold'});
            }
            continue;
        } else {
            rows[0].push({value: title, fontWeight: 'bold'});
        }
    }
    rows[0].push({value: "started datum", fontWeight: 'bold'});

    for(let r of res) {
        let idx = rows.push([]) - 1;
        for(let title of titles) {
            if(title === "ratings") {
                for(let rating of Object.values(r[title])) {
                    //csv += rating + ";";
                    rows[idx].push({value: rating, type: Number});
                }
                continue;
            } else {
                let txt = document.createElement("textarea");
                txt.innerHTML = r[title];
                rows[idx].push({value: txt.value, type: String});
            }
        }
        rows[idx].push({value: "DATEVALUE(K"+String(idx+1)+")", type: "Formula"});
    }

    return rows;
}

async function request_csv(sendResponse) {
    results = [];
    current_count = 0;
    error = "";
    pages = [];

    try {

        let table = document.querySelectorAll("table")[1];
        let rows = table.querySelectorAll("td > a");
        total_count = rows.length;
        for (let row of rows) {
            console.log("getting page", row.href);
            pages.push(get_page(row.href, sendResponse));
            console.log("got page", row.href);
        }

        await Promise.all(pages);
    } catch (e) {
        error = e.message;
    }
    

    if(error !== "") {
        chrome.runtime.sendMessage({status: "error", error: error});
        return;
    }

    console.log("getting csv");
    let filename = "ergebnisse.xlsx";
    try {
        let path = window.location.pathname.split("/");
        filename = path[path.length - 1];
    } catch (e) {

    }
    chrome.runtime.sendMessage({status: "success", data: get_xlsx(results), filename: filename});

}


  chrome.runtime.onMessage.addListener(
    function(msg, sender, sendResponse) {
        console.log(msg.request);
        switch (msg.request) {
            case "request_csv":
                console.log(window.location);
                if (!window.location.pathname.includes("/stats/")) {
                    chrome.runtime.sendMessage({status: "error", error: "Bitte gehe auf die \"Ergebnisse\" Seite des Bounds."});
                    return true;
                  }              
                request_csv(sendResponse);
                return true;
        }
    }
  );

console.log("content.js loaded");