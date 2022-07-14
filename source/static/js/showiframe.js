let frameoffclass = "frame-off";

let allowSubs = ["/archives/", "/posts/", "/categories/", "/tags/"]

let matchpath = window.location.pathname.match(/\/.*\//) || []
let firstPath = matchpath[0]
// console.log(firstPath)
// console.log(allowSubs.includes(firstPath))
// 在允许的路径中
if (allowSubs.includes(firstPath) && self == top) {
    let longiframeStyle = document.createElement("style")
    longiframeStyle.innerText = `.long-frame{width:500px;height:600px;border:none;position:absolute;z-index:9999;}.frame-on{display:block}.frame-off{display:none}`

    let longiframe = document.createElement("iframe")
    longiframe.id = "longframe"
    longiframe.classList.add(...["long-frame", "frame-off"])

    let body = document.getElementsByTagName("body")[0]

    body.append(longiframeStyle)
    body.append(longiframe)

    runscript()
}

function runscript() {
    let longframe = document.getElementById("longframe"); // 目前只有一个 iframe
    // console.log("longframe : ", longframe)

    this.document.querySelectorAll("a").forEach(a => {
        a.addEventListener("mouseover", e => showInIframe(longframe, e))
    });

    this.document.onclick = function (e) {
        // console.log(longframe.classList)
        longframe.classList.add(...[frameoffclass])
        // console.log(longframe.classList)

        longframe.src = ""
    };
    console.log("hello world !~");
}

function showInIframe(iframe, e) {
    console.log(e.target.href)

    let src = e.target.href || ""
    if (!src) { return }

    // 得去掉锚点，否则 fluid 主题的 scroll 会有问题
    src = src.split("#")[0]

    // 外链
    if (src.trimStart().startsWith("http")) {
        // 同源
        if (window.location.host == src.replace(/^(http|https):\/\//, "").split("/")[0]) {
            // console.log("iframe src",iframe.src, )
            // console.log("target src",src, )

            if (iframe.src == src) { return }
            // console.log(iframe.src, src)

            iframe.onload = function () {
                let posx = e.pageX; let posy = e.pageY;

                iframe.style.top = posy + 30 + "px";
                iframe.style.left = posx + 50 + "px";

                // console.log("开始前", iframe.classList)
                iframe.classList.remove(frameoffclass)
                // console.log("结束了", iframe.classList)

            }

            iframe.src = src;
            // console.log(iframe.src)
        }
    }
};

