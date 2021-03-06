<template>
  <v-container v-if="getPost" class="mt-3" flexbox center>
    <!-- Post Card -->
    <v-layout row wrap>
      <v-flex xs12>
        <v-card hover>
          <v-card-title>
            <h1>{{ getPost.title}}</h1>
            <v-btn @click="handleToggleLike" large icon v-if="user">
              <v-icon large :color="checkIfPostLiked(getPost._id) ? 'red' : 'grey'">favorite</v-icon>
            </v-btn>
            <h3 class="ml-3 font-weight-thin">{{ getPost.likes }} LIKES</h3>
            <v-spacer></v-spacer>
            <v-icon @click="goToPreviousPage" color="info" large>arrow_back</v-icon>
          </v-card-title>

          <v-tooltip right>
            <span>Click to enlarge image</span>
            <v-card-media
              @click="toggleImageDialog"
              slot="activator"
              :src="getPost.imageUrl"
              id="post__image"
            ></v-card-media>
          </v-tooltip>

          <!-- Post Image Dialog -->
          <v-dialog v-model="dialog" transition="dialog-transition">
            <v-card>
              <v-card-media :src="getPost.imageUrl" height="80vh"></v-card-media>
            </v-card>
          </v-dialog>

          <v-card-text>
            <span v-for="(category, index) in getPost.categories" :key="index">
              <v-chip class="mb-3" color="accent" text-color="white">{{category}}</v-chip>
            </span>
            <h3>{{ getPost.description }}</h3>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>

    <!-- Messages Section -->
    <div class="mt-3">
      <v-layout class="mb-3" v-if="user">
        <v-flex xs12>
          <v-form
            v-model="isFormValid"
            lazy-validation
            ref="form"
            @submit.prevent="handleAddPostMessage"
          >
            <v-layout row wrap>
              <v-text-field
                :rules="messageRules"
                v-model="messageBody"
                label="Add Message"
                type="text"
                :append-outer-icon="messageBody && 'send'"
                @click:append-outer="handleAddPostMessage"
                prepend-icon="email"
                clearable
                required
              ></v-text-field>
            </v-layout>
          </v-form>
        </v-flex>
      </v-layout>

      <!-- Messages -->
      <v-layout row wrap>
        <v-flex xs12>
          <v-list subheader two-line>
            <v-subheader>Messages ({{ getPost.messages.length }})</v-subheader>

            <template v-for="message in getPost.messages">
              <v-divider :key="message._id"></v-divider>

              <v-list-tile avatar inset :key="message.title">
                <v-list-tile-avatar>
                  <img :src="message.messageUser.avatar">
                </v-list-tile-avatar>

                <v-list-tile-content>
                  <v-list-tile-title>{{ message.messageBody }}</v-list-tile-title>
                  <v-list-tile-sub-title>
                    {{ message.messageUser.username }}
                    <span
                      class="grey--text text--lighten-1 hidden-xs-only"
                    >{{ message.messageDate | getTimeFromNow }}</span>
                  </v-list-tile-sub-title>
                </v-list-tile-content>

                <v-list-tile-action class="hidden-xs-only">
                  <v-icon :color="checkIfOwnMessage(message) ? 'accent' : 'grey'">chat_bubble</v-icon>
                </v-list-tile-action>
              </v-list-tile>
            </template>
          </v-list>
        </v-flex>
      </v-layout>
    </div>
  </v-container>
</template>

<script>
import { mapGetters, mapMutations } from "vuex";
import {
  GET_POST,
  ADD_POST_MESSAGE,
  LIKE_POST,
  UNLIKE_POST
} from "../../queries";

export default {
  name: "Post",
  props: ["postId"],
  data() {
    return {
      postLiked: false,
      dialog: false,
      messageBody: "",
      isFormValid: true,
      messageRules: [
        message => !!message || "Message is required",
        message =>
          (message && message.length < 75) ||
          "Message must be less than 75 characters"
      ]
    };
  },
  computed: {
    ...mapGetters(["loading", "user", "userFavorites"])
  },
  methods: {
    ...mapMutations(["setUser"]),
    checkIfPostLiked(postId) {
      if (
        this.userFavorites &&
        this.userFavorites.some(p => p._id === postId)
      ) {
        this.postLiked = true;
        return true;
      } else {
        this.postLiked = false;
        return false;
      }
    },
    handleToggleLike() {
      const variables = {
        postId: this.postId,
        username: this.user.username
      };
      this.$apollo
        .mutate({
          mutation: this.postLiked ? UNLIKE_POST : LIKE_POST,
          variables,
          update: (cache, { data: { likePost = {}, unlikePost = {} } }) => {
            const data = cache.readQuery({
              query: GET_POST,
              variables: {
                postId: this.postId
              }
            });

            if (this.postLiked) {
              data.getPost.likes -= 1;
            } else {
              data.getPost.likes += 1;
            }

            cache.writeQuery({
              query: GET_POST,
              variables: {
                postId: this.postId
              },
              data
            });
          }
        })
        .then(({ data }) => {
          const updatedUser = {
            ...this.user,
            favorites: this.postLiked
              ? data.unlikePost.favorites
              : data.likePost.favorites
          };
          this.setUser(updatedUser);
        })
        .catch(err => {
          console.error(err);
        });
    },
    handleAddPostMessage() {
      if (this.$refs.form.validate()) {
        const variables = {
          messageBody: this.messageBody,
          userId: this.user._id,
          postId: this.postId
        };
        this.$apollo
          .mutate({
            mutation: ADD_POST_MESSAGE,
            variables,
            update: (cache, { data: { addPostMessage } }) => {
              const data = cache.readQuery({
                query: GET_POST,
                variables: {
                  postId: this.postId
                }
              });

              data.getPost.messages.unshift(addPostMessage);

              // Write updated data back to query
              cache.writeQuery({
                query: GET_POST,
                variables: {
                  postId: this.postId
                },
                data
              });
            }
          })
          .then(({ data }) => {
            this.$refs.form.reset();
            console.log("data: ", data.addPostMessage);
          })
          .catch(err => console.error(err));
      }
    },
    goToPreviousPage() {
      this.$router.go(-1);
    },
    toggleImageDialog() {
      if (window.innerWidth > 500) {
        this.dialog = !this.dialog;
      }
    },
    checkIfOwnMessage(message) {
      return this.user && this.user._id === message.messageUser._id;
    }
  },
  apollo: {
    getPost: {
      query: GET_POST,
      variables() {
        return {
          postId: this.postId
        };
      }
    }
  }
};
</script>

<style scoped>
#post__image {
  height: 400px !important;
}
</style>