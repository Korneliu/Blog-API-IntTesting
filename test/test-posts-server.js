'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const should = chai.should();
const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedPostData() {
  console.info('seeding BlogPost data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogPostData());
  }
  return BlogPost.insertMany(seedData);
}

function generateAuthorFirstName() {
  const firstName = [
    'Jules', 'Jennifer', 'Mary', 'Lois', 'Robert'];
  return firstName[Math.floor(Math.random() * firstName.length)];
}

function generateAuthorLastName() {
  const lastName = ['Verne', 'Crosswell', 'Nelson', 'Hayek'];
  return lastName[Math.floor(Math.random() * lastName.length)];
}

function generateTitle() {
  const titles = ['Six Weeks', 'Dark Ocean', 'Dangerous Bay', 'Grey Wolf'];
  return titles[Math.floor(Math.random() * titles.length)];
};
function generateContent() {
  const content = ['lorem ipsum lorem ipsum '] 
  return content[Math.floor(Math.random() * content.length)]; 
}

function generateBlogPostData() {
  return {
    author: {firstName:generateAuthorFirstName(),lastName:generateAuthorLastName()},
    title: generateTitle(),
    content: generateContent(),
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('BlogPost API resource', function() {
    before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

 describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.length(count);
        });
    });
    it('should return BlogPosts with right fields', function() {
      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);
          res.body.forEach(function(posts) {
            posts.should.be.a('object');
            posts.should.include.keys(
              'id','author','title','content','created');
          });
          resPost = res.body[0];
          return BlogPost.findById(resPost.id);
        })
        .then(posts => {
          resPost.title.should.equal(posts.title);
          resPost.content.should.equal(posts.content); 
          resPost.author.should.equal(posts.authorName);
        });
    });
  });
 describe('POST endpoint', function() {
    it('should add a new post', function() {
      const newPosts = generateBlogPostData();
      console.log(newPosts);
      Object.assign(newPosts,newPosts.author)
      return chai.request(app)
        .post('/posts')
        .send(newPosts)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'author','title', 'content','created');
          res.body.id.should.not.be.null;
          res.body.author.should.equal(newPosts.firstName+' '+newPosts.lastName);
          res.body.title.should.equal(newPosts.title);
          res.body.content.should.equal(newPosts.content);
          return BlogPost.findById(res.body.id);
        })
        .then(function(post) {
          post.author.firstName.should.equal(`${newPosts.author.firstName}`);
          post.author.lastName.should.equal(`${newPosts.author.lastName}`);
          post.title.should.equal(newPosts.title);
          post.content.should.equal(newPosts.content);
        });
    });
  });
 describe('PUT endpoint', function() {
    it('should update fields you send over', function() {
      const updateData = {
        author: {firstName: 'Umberto',
                 lastName: 'Eco'
                },
        title: 'The Name of the Rose',
        content: 'Long time ago...'
      };

      return BlogPost
        .findOne()
        .then(function(posts) {
          updateData.id = posts.id;
          return chai.request(app)
            .put(`/posts/${posts.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(updateData.id);
        })
        .then(function( posts) {
          posts.author.firstName.should.equal(updateData.author.firstName);
          posts.author.lastName.should.equal(updateData.author.lastName);
          posts.title.should.equal(updateData.title);
          posts.content.should.equal(updateData.content);
        });
    });
  });
 describe('DELETE endpoint', function() {
    it('delete post by id', function() {
      let post;
      return BlogPost
        .findOne()
        .then(function(responsePost) {
          post = responsePost;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(function(anotherPost) {
          should.not.exist(anotherPost);
        });
    });
  });
});
 