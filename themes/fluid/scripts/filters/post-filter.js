/* global hexo */

'use strict';

// 生成前过滤文章
hexo.extend.filter.register('before_generate', function () {
  this._bindLocals();

  const allPages = this.locals.get('pages');
  // console.log(allPages)

  allPages.data.map((page) => {
    if (page.comment !== true) {
      page.comments = typeof page.comment === 'string' && page.comment !== '';
    } else {
      page.comments = true;
    }
    return page;
  });
  this.locals.set('pages', allPages);

  const allPosts = this.locals.get('posts');
  allPosts.data.map((post) => {
    if (post.comment === false) {
      post.comments = false;
    }
    return post;
  });
  const hidePosts = allPosts.filter(post => post.hide === true);
  const normalPosts = allPosts.filter(post => (post.publish === true && post.hide !== true));

  this.locals.set('all_posts', allPosts);
  this.locals.set('hide_posts', hidePosts);
  this.locals.set('posts', normalPosts);
});

const original_post_generator = hexo.extend.generator.get('post');

hexo.extend.generator.register('post', function (locals) {
  // 发送时需要把过滤的页面也加入
  return original_post_generator.bind(this)({
    posts: new locals.posts.constructor(
      locals.posts.data.concat(locals.hide_posts.data)
    )
  });
});


// data 为 
// [ 
// [{},{}], posts
// [] about,index
// ]
function doreplace(data) {
  let { content, title } = data;
  let result = content.match(/\[\[.+?\]\]/g);
  if (result && result.length > 0) {
    result.forEach((linkName) => {
      let [realName, showName] = (linkName + "")
        .replace("[[", "")
        .replace("]]", "")
        .split("|");
      let anchor = null;
      [realName, anchor] = realName.split("#");

      if (realName == '') {
        realName = title
      }

      let doc = hexo.locals.get(realName)

      if (doc) {
        let path = getsubpath(doc.permalink)

        content = content.replace(
          linkName,
          `<a href="${path}${anchor ? "#" + anchor : ""}" name="${realName}" >${showName || realName}</a>`
        );

        // console.log(content)
        // ss
      } else {
        content = content.replace(
          linkName,
          `<a href="/notpublish/index.html" name="${realName}" >${showName || realName}</a>`
        );
        // throw Error("doc is null ??? should not be !")
      }
    });
  }

  data.content = content;
  return data;
}

// 先统计
hexo.extend.filter.register("before_post_render",
  function (data) {
    if (ignore(data)) {return}

    hexo.locals.set(data.title, () => data)
  }, 0)

// 后替换
hexo.extend.filter.register("before_post_render",
  function (data) {
    if (ignore(data)) {return}

    doreplace(data)
  }, 0)

function ignore(data) {
  var sourceFileName = data.source;
  var ext = sourceFileName.substring(sourceFileName.lastIndexOf(".")).toLowerCase();
  return !data.publish || ext != '.md';
}


function getsubpath(p) {
  if (p.match(/^(http|https):\/\//)) {
    let u = new URL(p)
    return u.pathname
  }
  return p
}

function test() {
  let t = ["/","http://xxx.cn/", "https://xxx.cn/sss", "http://xxx.cn/sss/xxx", "http://xxx.cn/sss/xxx/", "http://xxx.cn/sss/xxx/", "ss://lnsfa.x/sd"]
  
  for (v of t ) {
    console.log("%s is %s", v, getsubpath(v))
  }
}