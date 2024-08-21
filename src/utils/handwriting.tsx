export type HandwritingRecognizeOptions = {
    width: number,
    height: number,
    language: string,
    numOfWords?: number | undefined,
    numOfReturn?: number | undefined
}
export function HandwritingRecognize (trace: number[][][], options: HandwritingRecognizeOptions, callback: (selection: string[]) => void, errCallback: (message: string) => void) {
    var data = JSON.stringify({
        "options": "enable_pre_space",
        "requests": [{
            "writing_guide": {
                "writing_area_width": options.width || undefined,
                "writing_area_height": options.height || undefined
            },
            "ink": trace,
            "language": options.language || "zh_TW"
        }]
    });
    var xhr = new XMLHttpRequest();
    xhr.addEventListener("readystatechange", function() {
        if (this.readyState === 4) {
            switch (this.status) {
                case 200:
                    var response = JSON.parse(this.responseText);
                    var results;
                    if (response.length === 1) errCallback(response[0]);
                    else results = response[1][0][1];
                    if (!!options.numOfWords) {
                        results = results.filter(function(result: any) {
                            return (result.length == options.numOfWords);
                        });
                    }
                    if (!!options.numOfReturn) {
                        results = results.slice(0, options.numOfReturn);
                    }
                    callback(results);
                    break;
                case 403:
                    errCallback("access denied");
                    break;
                case 503:
                    errCallback("can't connect to recognition server");
                    break;
            }


        }
    });
    xhr.open("POST", "https://www.google.com.tw/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8");
    xhr.setRequestHeader("content-type", "application/json");
    xhr.send(data);
}
