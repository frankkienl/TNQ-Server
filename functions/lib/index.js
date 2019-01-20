"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const firestore = admin.firestore();
const timeLimitWriteAnswers = 1000 * 60 * 2; //2 min
const timeLimitVote = 1000 * 30; //30 sec
const maxRounds = 3;
/**
 * TODO: finish this function
 * used internally
 * Get all info you need
 */
function getTnq(context) {
    return __awaiter(this, void 0, void 0, function* () {
        //Make object to return
        let tnq = {};
        //get user
        tnq['user'] = yield firestore.doc(`users/${context.auth.uid}`).get();
        return tnq;
    });
}
/**
 * Create user
 * Creates user-object in database, includes user.uid
 */
exports.createUser = functions.auth.user().onCreate((user) => __awaiter(this, void 0, void 0, function* () {
    return firestore.doc(`users/${user.uid}`).set({ uid: user.uid, nickname: user.displayName, createdAt: new Date() });
}));
/**
 * Create room
 * Creates room with unique roomCode, marks the player calling this as VIP.
 * @type {HttpsFunction}
 */
exports.createRoom = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    const roomCode = yield getUniqueRoomCode();
    //Set things up
    //Create room
    yield firestore.doc(`rooms/${roomCode}`).set({
        vip: context.auth.uid,
        status: 'waitingForPlayers',
        roomCode: roomCode
    });
    console.log(`created room ${roomCode}`);
    //Set roomCode in user
    const promiseAddRoomToUser = firestore.doc(`users/${context.auth.uid}`).set({
        roomCode: roomCode
    }, { merge: true });
    //Set VIP in room
    const userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    let promiseAddUserToRoom = firestore.doc(`rooms/${roomCode}/players/${context.auth.uid}`).set({
        uid: context.auth.uid,
        nickname: userSnapshot.data().nickname,
        vip: true
    });
    yield Promise.all([promiseAddUserToRoom, promiseAddRoomToUser]);
    return { roomCode: roomCode };
}));
/**
 * Join room
 * Used by user (not VIP) to join an existing room
 *
 * @type {HttpsFunction}
 */
exports.joinRoom = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    const roomCode = data.roomCode;
    //Get room
    const roomSnapshot = yield firestore.doc(`rooms/${roomCode}`).get();
    if (!roomSnapshot.exists) {
        //throw new Error('room does not exist');
        return { status: 'roomDoesNotExist' };
    }
    //Set roomCode in user
    let promiseAddRoomToUser = firestore.doc(`users/${context.auth.uid}`).set({
        roomCode: roomCode
    }, { merge: true });
    //Get user
    const userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    //Add user to room
    let promiseAddUserToRoom = firestore.doc(`rooms/${roomCode}/players/${context.auth.uid}`).set({
        uid: context.auth.uid,
        nickname: userSnapshot.data().nickname
    });
    yield Promise.all([promiseAddUserToRoom, promiseAddRoomToUser]);
    return { status: 'ok' };
}));
/**
 * Change user nickname
 * Used by user to change own nickname, also sets uid in user doc.
 *
 * @type {HttpsFunction}
 */
exports.changeNickname = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    //Change nickname in user
    yield firestore.doc(`users/${context.auth.uid}`).set({
        nickname: data.nickname,
        uid: context.auth.uid
    }, { merge: true });
    //Change in room
    //Get user (to see which room)
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    let user = userSnapshot.data();
    if (user.roomCode != null) {
        //User is in a room
        yield firestore.doc(`rooms/${user.roomCode}/players/${context.auth.uid}`).set({
            nickname: data.nickname
        }, { merge: true });
    }
}));
/**
 * Answer a question
 * Used by user to answer own question in a round,
 * sets playerDone when all questions for user in round are answered
 *
 * @type {HttpsFunction}
 */
exports.answerQuestion = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    let answeredQuestionId = data.answeredQuestionId;
    //Get all needed data
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    let roundSnapshot = yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'writeAnswers') {
        //check if round still in writeAnswers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'write answers' but '${round.status}' in room ${user.roomCode}, user ${user.uid}`);
    }
    //Check if this user is allowed to answer this question
    let questionsForUser = round.questionsPerUser[user.uid]; //array of question-ids
    let isForMe = false;
    questionsForUser.forEach((questionId) => {
        if (answeredQuestionId === questionId) {
            isForMe = true;
        }
    });
    if (!isForMe) {
        throw new Error(`Question ${answeredQuestionId} is not for user ${user.uid} to answer, in round ${room.status}, in room ${user.roomCode}`);
    }
    //User is allowed to answer this question
    //Check time limit
    let tooLate = false;
    if ((Date.parse(round.writeAnswersStartedAt) < Date.now() - (timeLimitWriteAnswers))) {
        //too late, but let's not enforce it.
        //Just mention it with the answer
        tooLate = true;
    }
    let toWrite = {};
    toWrite[answeredQuestionId] = data.answer;
    if (tooLate) {
        toWrite['tooLate'] = true;
    }
    //Write answer
    yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}/answers/${user.uid}`)
        .set(toWrite, { merge: true });
    //Check if user has answered all his questions
    let userAnswersSnapshot = yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}/answers/${user.uid}`).get();
    let userAnswers = userAnswersSnapshot.data();
    let userAllAnswered = true;
    questionsForUser.forEach((questionId) => {
        if (userAnswers[questionId] == null) {
            userAllAnswered = false; //There is an answer missing
        }
    });
    if (userAllAnswered) {
        yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}/playersDone/${user.uid}`)
            .set({ done: true });
        //Now check if the other players are done too.
        yield allAnswered(user.roomCode, room.status);
    }
}));
/**
 * Check if all users are done, to go the next fase
 * Called when playerDone is written in round.
 * When all users are done writing answers, advance round to voting fase.
 */
function allAnswered(roomCode, roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        //When a playerDone is written, check if all players are done.
        //If so go to next fase.
        //Players who are done
        let promisePlayerDoneCollection = firestore.collection(`rooms/${roomCode}/rounds/${roundId}/playersDone`).get();
        //Players who should be done
        let promisePlayersInRoom = firestore.collection(`rooms/${roomCode}/players`).get();
        let results = yield Promise.all([promisePlayerDoneCollection, promisePlayersInRoom]);
        let playersDone = results[0];
        let playersInRoom = results[1];
        if (playersDone.size === playersInRoom.size) {
            console.log("all questions are answered");
            yield goToVotingFase(roomCode, roundId);
        }
    });
}
/**
 * Skip waiting go to voting
 * Used by VIP when time limit is over, to skip to voting fase.
 * VIP can wait for players to finish, but if it takes too long, skip.
 *
 * @type {HttpsFunction}
 */
exports.vipEndWritingAnswers = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    //Get all needed data
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.roomCode}`);
    }
    let roundSnapshot = yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'writeAnswers') {
        //check if round still in writeAnswers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'write answers' but '${round.status}' in room ${user.roomCode}, user ${user.uid}`);
    }
    //Check time limit
    if ((Date.parse(round.writeAnswersStartedAt) > Date.now() - (timeLimitWriteAnswers))) {
        //Time not over yet
        throw new Error(`Cannot skip to voting, time limit not over yet. Round ${room.status} in room ${user.roomCode}, user ${user.uid}`);
    }
    //Time limit is over, the user is the VIP
    //So we can skip to voting.
    yield goToVotingFase(user.roomCode, room.status);
}));
/**
 * Go to voting fase
 * @param roomCode
 * @param roundId
 * @returns {Promise<any>}
 */
function goToVotingFase(roomCode, roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield firestore.doc('rooms/' + roomCode + '/rounds/' + roundId).set({ status: 'vote' }, { merge: true });
        yield prepareVoting(roomCode, roundId);
    });
}
/**
 * Go to next vote
 * @type {HttpsFunction}
 */
exports.vipNextVote = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    //Get all needed data
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.roomCode}`);
    }
    let roundSnapshot = yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'voteResult') {
        //check if round still in writeAnswers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'voteResult' but '${round.status}' in room ${user.roomCode}, user ${user.uid}`);
    }
    yield goToVotingFase(user.roomCode, room.status);
}));
/**
 * Prepare vote of question with index
 * @param roomCode
 * @param roundId
 * @returns {Promise<void>}
 */
function prepareVoting(roomCode, roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("prepare voting");
        const roundSnapshot = yield firestore.doc(`rooms/${roomCode}/rounds/${roundId}`).get();
        const round = roundSnapshot.data();
        if (round.status !== 'vote') {
            throw new Error(`Round ${roundId} of room ${roomCode} is not in voting fase`);
        }
        //Set index of (next) question to vote for
        let index = 0; //array's start at 0
        if (round.votingQuestionIndex != null) {
            index = round.votingQuestionIndex + 1;
        }
        //Check if there actually is a next question to vote for, otherwise, go to results.
        let numberOfPlayers = Object.keys(round.questionsPerUser).length;
        if (index >= numberOfPlayers) {
            console.log("No next voting, go to results");
            //No next voting, go to results
            yield firestore.doc(`rooms/${roomCode}/rounds/${roundId}`)
                .set({
                status: 'results',
                writeAnswersStartedAt: null,
                votingStartedAt: null,
                votingQuestionIndex: null,
                votingQuestionId: null
            }, { merge: true });
            //Clear playersDone
            yield deleteCollection(firestore, `rooms/${roomCode}/rounds/${roundId}/playersDone`, 100);
        }
        else {
            //Lets vote
            //Clear playersDone
            yield deleteCollection(firestore, `rooms/${roomCode}/rounds/${roundId}/playersDone`, 100);
            //set next question to vote for
            yield firestore.doc(`rooms/${roomCode}/rounds/${roundId}`)
                .set({ votingStartedAt: new Date(), votingQuestionIndex: index, votingQuestionId: 'question' + (index + 1) }, { merge: true });
        }
    });
}
exports.voteForAnswer = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    let votedQuestionId = data.votedQuestionId;
    //Get all needed data
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    let roundSnapshot = yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'vote') {
        //check if round still in writeAnswers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'vote' but '${round.status}' in room ${user.roomCode}, user ${user.uid}`);
    }
    //Check if this user is allowed to vote for this question
    let questionsForUser = round.questionsPerUser[user.uid]; //array of question-ids
    let allowedToVote = true;
    questionsForUser.forEach((questionId) => {
        if (votedQuestionId === questionId) {
            allowedToVote = false;
        }
    });
    if (!allowedToVote) {
        throw new Error(`Question ${votedQuestionId} is not for user ${user.uid} to vote for, in round ${room.status}, in room ${user.roomCode}`);
    }
    //User is allowed to answer this question
    //Check time limit
    let tooLate = false;
    if ((Date.parse(round.writeAnswersStartedAt) < Date.now() - (timeLimitVote))) {
        //too late, but let's not enforce it.
        //Just mention it with the answer
        tooLate = true;
    }
    let toWrite = {};
    toWrite[votedQuestionId] = data.vote;
    if (tooLate) {
        toWrite['tooLate'] = true;
    }
    //Write answer
    yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}/votes/${user.uid}`)
        .set(toWrite, { merge: true });
    //When voted, this player is done
    yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}/playersDone/${user.uid}`)
        .set({ done: true });
    //Now check if other players are done too.
    yield allVoted(user.roomCode, room.status);
}));
function allVoted(roomCode, roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        //When a playerDone is written, check if all players are done.
        //If so go to vote result (and then to next voting).
        //Players who are done
        let promisePlayerDoneCollection = firestore.collection(`rooms/${roomCode}/rounds/${roundId}/playersDone`).get();
        //Players who should be done
        let promisePlayersInRoom = firestore.collection(`rooms/${roomCode}/players`).get();
        let results = yield Promise.all([promisePlayerDoneCollection, promisePlayersInRoom]);
        let playersDone = results[0];
        let playersInRoom = results[1];
        //playersDone.size - 2, because 2 players are NOT allowed to vote.
        if (playersDone.size === (playersInRoom.size - 2)) {
            //show voting result
            yield prepareVotingResult(roomCode, roundId);
        }
    });
}
/**
 * Skip waiting go to voting result
 * Used by VIP when voting time limit is over, skip to vote result
 * VIP can wait for players to finish, but if it takes to long, skip.
 * @type {HttpsFunction}
 */
exports.vipEndVoting = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    //Get all needed data
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.roomCode}`);
    }
    let roundSnapshot = yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.roomCode} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'vote') {
        //check if round still in writeAnswers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'vote' but '${round.status}' in room ${user.roomCode}, user ${user.uid}`);
    }
    //Check time limit
    if ((Date.parse(round.writeAnswersStartedAt) > Date.now() - (timeLimitVote))) {
        //Time not over yet
        throw new Error(`Cannot skip voting, time limit not over yet. Round ${room.status} in room ${user.roomCode}, user ${user.uid}`);
    }
    //Time limit is over, the user is the VIP
    //So we can skip to voting result.
    yield prepareVotingResult(user.roomCode, room.status);
}));
function prepareVotingResult(roomCode, roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        //Get room
        console.log(`prepareVotingResult: ${roomCode}, ${roundId}`);
        //let roomSnapshot = await firestore.doc(`rooms/${roomCode}`).get();
        let roundSnapshot = yield firestore.doc(`rooms/${roomCode}/rounds/${roundId}`).get();
        let round = roundSnapshot.data();
        let questionId = round.votingQuestionId;
        //Get question
        console.log(`prepareVotingResult; index=${round.votingQuestionIndex} id=${questionId} -- rooms/${roomCode}/rounds/${roundId}/questions/${questionId}`);
        let questionSnapshot = yield firestore
            .doc(`rooms/${roomCode}/rounds/${roundId}/questions/${questionId}`)
            .get();
        let question = questionSnapshot.data();
        console.log(`prepareVotingResult:: ${questionId} -- ${question.question.question}`);
        //Get votes
        let votesCollection = yield firestore.collection(`rooms/${roomCode}/rounds/${roundId}/votes`).get();
        console.log(`prepareVotingResult:; votesCollection `);
        //Copy to voteResults
        let leftVotes = [];
        let rightVotes = [];
        votesCollection.forEach((voteSnapshot) => __awaiter(this, void 0, void 0, function* () {
            let voter = voteSnapshot.id;
            let vote = voteSnapshot.data();
            if (vote[questionId] === question.leftPlayer) {
                leftVotes.push(voter);
            }
            else if (vote[questionId] === question.rightPlayer) {
                rightVotes.push(voter);
            }
            else {
                console.log(`prepareVotingResult:; vote Else`);
            }
        }));
        let toWrite = {
            leftPoints: leftVotes.length,
            leftVotes: leftVotes,
            rightPoints: rightVotes.length,
            rightVotes: rightVotes
        };
        console.log(`prepareVotingResult;; ${toWrite}`);
        yield firestore.doc(`rooms/${roomCode}/rounds/${roundId}/voteResults/${questionId}`)
            .set(toWrite);
        //add points to players
        if (leftVotes.length > 0) {
            let playerDoc = yield firestore.doc(`rooms/${roomCode}/players/${question.leftPlayer}`).get();
            let player = playerDoc.data();
            if (!player.score) {
                yield firestore.doc(`rooms/${roomCode}/players/${question.leftPlayer}`).set({ score: leftVotes.length }, { merge: true });
            }
            else {
                yield firestore.doc(`rooms/${roomCode}/players/${question.leftPlayer}`).set({ score: (player.score + leftVotes.length) }, { merge: true });
            }
        }
        if (rightVotes.length > 0) {
            let playerDoc = yield firestore.doc(`rooms/${roomCode}/players/${question.rightPlayer}`).get();
            let player = playerDoc.data();
            if (!player.score) {
                yield firestore.doc(`rooms/${roomCode}/players/${question.rightPlayer}`).set({ score: leftVotes.length }, { merge: true });
            }
            else {
                yield firestore.doc(`rooms/${roomCode}/players/${question.rightPlayer}`).set({ score: (player.score + leftVotes.length) }, { merge: true });
            }
        }
        //show vote result
        yield firestore.doc(`rooms/${roomCode}/rounds/${roundId}`)
            .set({ status: 'voteResult' }, { merge: true });
    });
}
/**
 * Remove user from room
 * Can be used by VIP, to kick player or to remove himself, thereby deleting the room
 * Or can be used by other players to leave the room
 *
 * @type {HttpsFunction}
 */
exports.removeUserFromRoom = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    let deleteRoom = false; //true = real delete, false = soft delete
    let userUidToRemove = data.userToRemove;
    if (userUidToRemove == null) {
        //self
        userUidToRemove = context.auth.uid;
    }
    let isSelfRemove = (context.auth.uid === userUidToRemove);
    let userSnapshot = yield firestore.doc(`users/${userUidToRemove}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${userUidToRemove} does not exist`);
    }
    let userToRemove = userSnapshot.data();
    if (userToRemove.roomCode == null) {
        //user not in a room, done here
        return;
    }
    //When not self remove, check if caller is actually in same room and is the VIP
    if (!isSelfRemove) {
        let callerSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
        if (!userSnapshot.exists) {
            throw new Error(`Caller ${context.auth.uid} does not exist`);
        }
        let caller = callerSnapshot.data();
        if (caller.currency !== userToRemove.roomCode) {
            throw new Error(`Caller ${context.auth.uid} and User ${userUidToRemove} are not in the same room. ${caller.roomCode} & ${userToRemove.roomCode}`);
        }
        let callerRoomSnapshot = yield firestore.doc(`rooms/${caller.roomCode}`).get();
        if (!callerRoomSnapshot.exists) {
            throw new Error(`Room ${caller.roomCode} does not exist`);
        }
        let callerRoom = callerRoomSnapshot.data();
        if (callerRoom.vip !== context.auth.uid) {
            throw new Error(`Caller ${context.auth.uid} is not the VIP of room ${caller.roomCode}`);
        }
        //Kick user
        //Remove user from room
        yield firestore.doc(`rooms/${caller.roomCode}/players/${userUidToRemove}`).delete();
        //Remove room from user
        yield firestore.doc(`users/${userUidToRemove}`).set({ roomCode: null }, { merge: true });
    }
    else {
        //Removing self
        let userRoomSnapshot = yield firestore.doc(`rooms/${userToRemove.roomCode}`).get();
        if (!userRoomSnapshot.exists) {
            throw new Error(`Room ${userToRemove.roomCode} does not exist, user ${userUidToRemove}`);
        }
        const userRoom = userRoomSnapshot.data();
        let userIsVip = (userRoom.vip === userUidToRemove && userUidToRemove === context.auth.uid);
        if (userIsVip) {
            //When VIP leaves room, (soft-) delete room
            if (deleteRoom) {
                //real delete
                yield userRoomSnapshot.ref.delete();
            }
            else {
                //soft delete
                yield firestore.doc(`rooms/${userToRemove.roomCode}`).set({
                    status: 'deleted',
                    deletedAt: new Date()
                }, { merge: true });
            }
        }
        else {
            //Remove user from room
            yield firestore.doc(`rooms/${userToRemove.roomCode}/players/${userUidToRemove}`).delete();
            //Remove room from user
            yield firestore.doc(`users/${userUidToRemove}`).set({ roomCode: null }, { merge: true });
        }
    }
}));
exports.startGame = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    const addDefaultquestionPacks = true; //false=throw error on no questionPacks
    const defaultquestionPacks = ['mlp1', 'normal1', 'cah1', 'cae1'];
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} is not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${context.auth.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.roomCode}`);
    }
    if (room.status !== 'waitingForPlayers') {
        throw new Error(`Room ${user.roomCode} already started`);
    }
    let playersCollection = yield firestore.collection(`rooms/${user.roomCode}/players`).get();
    if (playersCollection.size < 3) {
        throw new Error(`Room ${user.roomCode} does not have enough players`);
    }
    if (room.questionPacks === undefined || room.questionPacks == null || room.questionPacks.length === 0) {
        if (!addDefaultquestionPacks) {
            throw new Error(`No questionPacks in room ${user.roomCode}`);
        }
        //Not enough questionPacks, add default
        yield firestore.doc(`rooms/${user.roomCode}`).set({ questionPacks: defaultquestionPacks }, { merge: true });
    }
    yield prepareRound(user.roomCode, playersCollection, 0);
    yield firestore.doc(`rooms/${user.roomCode}`).set({
        status: 'round1',
        roundIndex: 0,
        roundId: 'round1'
    }, { merge: true });
}));
function prepareRound(roomCode, playerCollection, roundIndex) {
    return __awaiter(this, void 0, void 0, function* () {
        const roundId = 'round' + (roundIndex + 1);
        //get number of players
        const nrOfPlayers = playerCollection.size;
        //get all questions of all questionPacks, to select some random questions
        let questionPackPromises = [];
        let questions = []; //all questions of all questionPacks
        const roomSnapshot = yield firestore.doc(`rooms/${roomCode}`).get();
        const room = roomSnapshot.data();
        room.questionPacks.forEach((questionPackId) => {
            questionPackPromises.push(firestore.collection(`questionpacks/${questionPackId}/questions`).get());
        });
        console.log('getting all questions of questionPacks, room:' + roomCode);
        let questionPackResults = yield Promise.all(questionPackPromises);
        //add all questions to 1 big array
        questionPackResults.forEach((questionPackQuestions) => {
            questionPackQuestions.forEach((questionDoc) => {
                questions.push(questionDoc.data());
            });
        });
        console.log('received all questions of questionPacks');
        //assign questions to players
        let promiseWrites = [];
        let questionsPerUser = {};
        for (let j = 0; j < nrOfPlayers; j++) {
            //init arrays, to be able to push questions
            questionsPerUser[playerCollection.docs[j].data().uid] = [];
        }
        for (let i = 1; i <= nrOfPlayers; i++) {
            //TODO: make sure players don't get the same question twice, check for unique.
            let question = arrayRandomElement(questions);
            let leftPlayer = playerCollection.docs[Math.ceil(i / 2) - 1].data().uid;
            let rightPlayer;
            if (i !== nrOfPlayers) {
                rightPlayer = playerCollection.docs[nrOfPlayers - Math.floor(i / 2) - 1].data().uid;
            }
            else {
                rightPlayer = playerCollection.docs[nrOfPlayers - 1].data().uid;
            }
            //set per user and per question
            //Per question
            let questionObjectToSet = {
                id: i,
                question: question,
                leftPlayer: leftPlayer,
                rightPlayer: rightPlayer
            };
            //Questions per user:
            questionsPerUser[leftPlayer].push('question' + i);
            questionsPerUser[rightPlayer].push('question' + i);
            let promiseWriteQuestion = firestore.doc(`rooms/${roomCode}/rounds/${roundId}/questions/question${i}`)
                .set(questionObjectToSet);
            promiseWrites.push(promiseWriteQuestion);
        }
        //Write round object itself
        let promiseWriteRound = firestore.doc(`rooms/${roomCode}/rounds/${roundId}`)
            .set({
            roundId: roundId,
            roundIndex: roundIndex,
            status: 'writeAnswers',
            writeAnswersStartedAt: new Date(),
            writeAnswersTimeLimit: timeLimitWriteAnswers,
            questionsPerUser: questionsPerUser
        }, { merge: true });
        promiseWrites.push(promiseWriteRound);
        console.log('prepareRound writing questions (with players) to room...');
        yield Promise.all(promiseWrites);
    });
}
exports.vipGoToNextRound = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    console.log('vipGoToNextRound');
    let userSnapshot = yield firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.roomCode == null) {
        throw new Error(`User ${context.auth.uid} is not in a room`);
    }
    let roomSnapshot = yield firestore.doc(`rooms/${user.roomCode}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.roomCode} does not exist, user ${context.auth.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.roomCode}`);
    }
    let playersCollection = yield firestore.collection(`rooms/${user.roomCode}/players`).get();
    //TODO: FIXME: use some proper number formatting!!
    let roundIndex = room.roundIndex;
    let roundId = room.roundId;
    roundIndex += 1;
    roundId = 'round' + (roundIndex + 1);
    if (roundIndex > (maxRounds - 1)) { //index starts at 0 ;-)
        //game is over
        yield firestore.doc(`rooms/${user.roomCode}`).set({ status: `gameOver` }, { merge: true });
        yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.roundId}`).set({ status: 'ended' }, { merge: true });
    }
    else {
        yield prepareRound(user.roomCode, playersCollection, roundIndex);
        yield firestore.doc(`rooms/${user.roomCode}/rounds/${room.roundId}`).set({ status: 'ended' }, { merge: true });
        yield firestore.doc(`rooms/${user.roomCode}`).set({
            status: roundId,
            roundIndex: roundIndex,
            roundId: roundId
        }, { merge: true });
    }
}));
exports.ftnqCleanupAnonUsers = functions.https.onCall((data, context) => __awaiter(this, void 0, void 0, function* () {
    if (context.auth.uid !== "98QSdK5XAyYfjSoCZFN9hyh50xg2") {
        return new Error('not allowed');
    }
    let listUsersResult = yield admin.auth().listUsers();
    let promises = [];
    listUsersResult.users.forEach((userRecord) => {
        //has not logged in for at least 30 days
        let numDays = 2;
        let lastSignInTime = userRecord.metadata.lastSignInTime;
        let isInactive = Date.parse(userRecord.metadata.lastSignInTime) < (Date.now() - numDays * 24 * 60 * 60 * 1000);
        let isAnon = userRecord.providerData.length === 0;
        if (isInactive && isAnon) {
            if (promises.length < 20) {
                promises.push(admin.auth().deleteUser(userRecord.uid));
            }
        }
    });
    console.log('deleting ' + promises.length + ' users');
    return Promise.all(promises);
}));
/**
 * Generates a roomCode that's been checked to be unique
 * @returns {Promise<string>}
 */
function getUniqueRoomCode() {
    return __awaiter(this, void 0, void 0, function* () {
        let roomCodeCode = "";
        let maxTries = 10;
        for (let i = 0; i < maxTries; i++) {
            roomCodeCode = randomRoomCode();
            let roomDoc = yield firestore.doc('rooms/' + roomCodeCode).get();
            if (!roomDoc.exists) {
                //Room does not exist, meaning roomCode is unique, and ready to be used.
                return roomCodeCode;
            }
        }
        throw new Error('cannot find unique roomCode');
    });
}
function randomRoomCode() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}
function arrayRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function arrayContains(array, obj) {
    //http://stackoverflow.com/questions/237104/how-do-i-check-if-an-array-includes-an-object-in-javascript
    for (let i = 0; i < array.length; i++) {
        if (array[i] === obj) {
            return true;
        }
    }
    return false;
}
/**
 * Delete all documents in a collection
 * https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
 * @param db
 * @param collectionPath
 * @param batchSize
 * @returns {Promise<any>}
 */
function deleteCollection(db, collectionPath, batchSize) {
    return __awaiter(this, void 0, void 0, function* () {
        //https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
        const collectionRef = db.collection(collectionPath);
        const query = collectionRef.orderBy('__name__').limit(batchSize);
        return new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
    });
}
/**
 * Delete all document in a collection, in batches
 * https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
 * @param db
 * @param query
 * @param batchSize
 * @param resolve
 * @param reject
 */
function deleteQueryBatch(db, query, batchSize, resolve, reject) {
    //https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
    query.get()
        .then((snapshot) => {
        // When there are no documents left, we are done
        if (snapshot.size == 0) {
            return 0;
        }
        // Delete documents in a batch
        let batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        return batch.commit().then(() => {
            return snapshot.size;
        });
    }).then((numDeleted) => {
        if (numDeleted === 0) {
            resolve();
            return;
        }
        // Recurse on the next process tick, to avoid
        // exploding the stack.
        process.nextTick(() => {
            deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
    }).catch(reject);
}
//# sourceMappingURL=index.js.map