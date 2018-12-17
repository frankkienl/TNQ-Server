import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const firestore = admin.firestore();

const timeLimitWriteAnswers = 1000 * 60 * 2; //2 min
const timeLimitVote = 1000 * 30; //30 sec

/**
 * TODO: finish this function
 * used internally
 * Get all info you need
 */
async function getTnq(context){
    //Make object to return
    let tnq = {};
    //get user
    tnq['user'] = await firestore.doc(`users/${context.auth.uid}`).get();

    return tnq;
}

/**
 * Create user
 * Creates user-object in database, includes user.uid
 */
export const createUser = functions.auth.user().onCreate(async (user) => {
    return firestore.doc(`users/${user.uid}`).set(
        {uid: user.uid, nickname: user.displayName, created_at: new Date()}
    );
});

/**
 * Create room
 * Creates room with unique roomCode, marks the player calling this as VIP.
 * @type {HttpsFunction}
 */
export const createRoom = functions.https.onCall(async (data, context) => {
    const roomCode = await getUniqueRoomCode();
    //Set things up
    //Create room
    await firestore.doc(`rooms/${roomCode}`).set({
        vip: context.auth.uid,
        status: 'waiting_for_players',
        roomCode: roomCode
    });
    console.log(`created room ${roomCode}`);

    //Set roomCode in user
    const promiseAddRoomToUser = firestore.doc(`users/${context.auth.uid}`).set({
        currentRoom: roomCode
    }, {merge: true});

    //Set VIP in room
    const userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    let promiseAddUserToRoom = firestore.doc(`rooms/${roomCode}/players/${context.auth.uid}`).set({
        uid: context.auth.uid,
        nickname: userSnapshot.data().nickname,
        vip: true
    });

    await Promise.all([promiseAddUserToRoom, promiseAddRoomToUser]);

    return {roomCode: roomCode};
});

/**
 * Join room
 * Used by user (not VIP) to join an existing room
 *
 * @type {HttpsFunction}
 */
export const joinRoom = functions.https.onCall(async (data, context) => {
    const roomCode = data.roomCode;
    //Get room
    const roomSnapshot = await firestore.doc(`rooms/${roomCode}`).get();
    if (!roomSnapshot.exists) {
        //throw new Error('room does not exist');
        return {status: 'room_does_not_exist'};
    }

    //Set roomCode in user
    let promiseAddRoomToUser = firestore.doc(`users/${context.auth.uid}`).set({
        currentRoom: roomCode
    }, {merge: true});

    //Get user
    const userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    //Add user to room
    let promiseAddUserToRoom = firestore.doc(`rooms/${roomCode}/players/${context.auth.uid}`).set({
        uid: context.auth.uid,
        nickname: userSnapshot.data().nickname
    });

    await Promise.all([promiseAddUserToRoom, promiseAddRoomToUser]);

    return {status: 'ok'};
});

/**
 * Change user nickname
 * Used by user to change own nickname, also sets uid in user doc.
 *
 * @type {HttpsFunction}
 */
export const changeNickname = functions.https.onCall(async (data, context) => {
    //Change nickname in user
    await firestore.doc(`users/${context.auth.uid}`).set({
        nickname: data.nickname,
        uid: context.auth.uid
    }, {merge: true});

    //Change in room
    //Get user (to see which room)
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    let user = userSnapshot.data();
    if (user.currentRoom != null) {
        //User is in a room
        await firestore.doc(`rooms/${user.currentRoom}/players/${context.auth.uid}`).set({
            nickname: data.nickname
        }, {merge: true});
    }
});

/**
 * Answer a question
 * Used by user to answer own question in a round,
 * sets playerDone when all questions for user in round are answered
 *
 * @type {HttpsFunction}
 */
export const answerQuestion = functions.https.onCall(async (data, context) => {
    let answeredQuestionId = data.answeredQuestionId;
    //Get all needed data
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    let roundSnapshot = await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'write_answers') {
        //check if round still in write_answers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'write answers' but '${round.status}' in room ${user.currentRoom}, user ${user.uid}`);
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
        throw new Error(`Question ${answeredQuestionId} is not for user ${user.uid} to answer, in round ${room.status}, in room ${user.currentRoom}`);
    }
    //User is allowed to answer this question
    //Check time limit
    let tooLate = false;
    if ((Date.parse(round.started_at_wa) < Date.now() - (timeLimitWriteAnswers))) {
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
    await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}/answers/${user.uid}`)
        .set(toWrite, {merge: true});

    //Check if user has answered all his questions
    let userAnswersSnapshot = await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}/answers/${user.uid}`).get();
    let userAnswers = userAnswersSnapshot.data();
    let userAllAnswered = true;
    questionsForUser.forEach((questionId) => {
        if (userAnswers[questionId] == null) {
            userAllAnswered = false; //There is an answer missing
        }
    });
    if (userAllAnswered) {
        await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}/players_done/${user.uid}`)
            .set({done: true});

        //Now check if the other players are done too.
        await allAnswered(user.currentRoom, room.status);
    }
});

/**
 * Check if all users are done, to go the next fase
 * Called when playerDone is written in round.
 * When all users are done writing answers, advance round to voting fase.
 */
async function allAnswered(roomCode, roundNr) {
    //When a playerDone is written, check if all players are done.
    //If so go to next fase.

    //Players who are done
    let promisePlayerDoneCollection = firestore.collection(`rooms/${roomCode}/rounds/${roundNr}/players_done`).get();

    //Players who should be done
    let promisePlayersInRoom = firestore.collection(`rooms/${roomCode}/players`).get();

    let results = await Promise.all([promisePlayerDoneCollection, promisePlayersInRoom]);
    let playersDone = results[0];
    let playersInRoom = results[1];
    if (playersDone.size === playersInRoom.size) {
        console.log("all questions are answered");
        await goToVotingFase(roomCode, roundNr);
    }
}

/**
 * Skip waiting go to voting
 * Used by VIP when time limit is over, to skip to voting fase.
 * VIP can wait for players to finish, but if it takes too long, skip.
 *
 * @type {HttpsFunction}
 */
export const vipEndWritingAnswers = functions.https.onCall(async (data, context) => {
    //Get all needed data
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.currentRoom}`);
    }
    let roundSnapshot = await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'write_answers') {
        //check if round still in write_answers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'write answers' but '${round.status}' in room ${user.currentRoom}, user ${user.uid}`);
    }
    //Check time limit
    if ((Date.parse(round.started_at_wa) > Date.now() - (timeLimitWriteAnswers))) {
        //Time not over yet
        throw new Error(`Cannot skip to voting, time limit not over yet. Round ${room.status} in room ${user.currentRoom}, user ${user.uid}`);
    }

    //Time limit is over, the user is the VIP
    //So we can skip to voting.
    await goToVotingFase(user.currentRoom, room.status);
});

/**
 * Go to voting fase
 * @param roomCode
 * @param roundNr
 * @returns {Promise<any>}
 */
async function goToVotingFase(roomCode, roundNr) {
    await firestore.doc('rooms/' + roomCode + '/rounds/' + roundNr).set({status: 'vote'}, {merge: true});
    await prepareVoting(roomCode, roundNr);
}

/**
 * Go to next vote
 * @type {HttpsFunction}
 */
export const vipNextVote = functions.https.onCall(async (data, context) => {
    //Get all needed data
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.currentRoom}`);
    }
    let roundSnapshot = await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'voteResult') {
        //check if round still in write_answers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'voteResult' but '${round.status}' in room ${user.currentRoom}, user ${user.uid}`);
    }
    await goToVotingFase(user.currentRoom, room.status);
});

/**
 * Prepare vote of question with index
 * @param roomCode
 * @param roundNr
 * @returns {Promise<void>}
 */
async function prepareVoting(roomCode, roundNr) {
    console.log("prepare voting");
    const roundSnapshot = await firestore.doc(`rooms/${roomCode}/rounds/${roundNr}`).get();
    const round = roundSnapshot.data();
    if (round.status !== 'vote') {
        throw new Error(`Round ${roundNr} of room ${roomCode} is not in voting fase`);
    }

    //Set index of (next) question to vote for
    let index = 0; //array's start at 0
    if (round.vote_question_index != null) {
        index = round.vote_question_index + 1;
    }
    //Check if there actually is a next question to vote for, otherwise, go to results.
    let numberOfPlayers = Object.keys(round.questionsPerUser).length;
    if (index >= numberOfPlayers) {
        console.log("No next voting, go to results");
        //No next voting, go to results
        await firestore.doc(`rooms/${roomCode}/rounds/${roundNr}`)
            .set({
                    status: 'results', //set new status
                    started_at_wa: null, //remove old data
                    started_at_v: null,
                    vote_question_index: null
                },
                {merge: true});
        //Clear players_done
        await deleteCollection(firestore, `rooms/${roomCode}/rounds/${roundNr}/players_done`, 100);
    } else {
        //Lets vote
        //Clear players_done
        await deleteCollection(firestore, `rooms/${roomCode}/rounds/${roundNr}/players_done`, 100);
        //set next question to vote for
        await firestore.doc(`rooms/${roomCode}/rounds/${roundNr}`)
            .set({started_at_v: new Date(), vote_question_index: index},
                {merge: true});
    }
}

export const voteForAnswer = functions.https.onCall(async (data, context) => {
    let votedQuestionId = data.votedQuestionId;
    //Get all needed data
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    let roundSnapshot = await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'vote') {
        //check if round still in write_answers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'vote' but '${round.status}' in room ${user.currentRoom}, user ${user.uid}`);
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
        throw new Error(`Question ${votedQuestionId} is not for user ${user.uid} to vote for, in round ${room.status}, in room ${user.currentRoom}`);
    }
    //User is allowed to answer this question
    //Check time limit
    let tooLate = false;
    if ((Date.parse(round.started_at_wa) < Date.now() - (timeLimitVote))) {
        //too late, but let's not enforce it.
        //Just mention it with the answer
        tooLate = true;
    }
    let toWrite = {};
    toWrite[`question${votedQuestionId}`] = data.vote;
    if (tooLate) {
        toWrite['tooLate'] = true;
    }
    //Write answer
    await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}/votes/${user.uid}`)
        .set(toWrite, {merge: true});
    //When voted, this player is done
    await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}/players_done/${user.uid}`)
        .set({done: true});
    //Now check if other players are done too.
    await allVoted(user.currentRoom, room.status);
});

async function allVoted(roomCode, roundNr) {
    //When a playerDone is written, check if all players are done.
    //If so go to vote result (and then to next voting).

    //Players who are done
    let promisePlayerDoneCollection = firestore.collection(`rooms/${roomCode}/rounds/${roundNr}/players_done`).get();

    //Players who should be done
    let promisePlayersInRoom = firestore.collection(`rooms/${roomCode}/players`).get();

    let results = await Promise.all([promisePlayerDoneCollection, promisePlayersInRoom]);
    let playersDone = results[0];
    let playersInRoom = results[1];
    //playersDone.size - 2, because 2 players are NOT allowed to vote.
    if (playersDone.size === (playersInRoom.size - 2)) {
        //show voting result
        await prepareVotingResult(roomCode, roundNr);
    }
}

/**
 * Skip waiting go to voting result
 * Used by VIP when voting time limit is over, skip to vote result
 * VIP can wait for players to finish, but if it takes to long, skip.
 * @type {HttpsFunction}
 */
export const vipEndVoting = functions.https.onCall(async (data, context) => {
    //Get all needed data
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.currentRoom}`);
    }
    let roundSnapshot = await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).get();
    if (!roundSnapshot.exists) {
        throw new Error(`Round ${room.status} in room ${user.currentRoom} does not exist, user ${user.uid}`);
    }
    let round = roundSnapshot.data();
    if (round.status !== 'vote') {
        //check if round still in write_answers fase, (not gone to voting fase)
        throw new Error(`Round ${room.status} 's status is not 'vote' but '${round.status}' in room ${user.currentRoom}, user ${user.uid}`);
    }
    //Check time limit
    if ((Date.parse(round.started_at_wa) > Date.now() - (timeLimitVote))) {
        //Time not over yet
        throw new Error(`Cannot skip voting, time limit not over yet. Round ${room.status} in room ${user.currentRoom}, user ${user.uid}`);
    }

    //Time limit is over, the user is the VIP
    //So we can skip to voting result.
    await prepareVotingResult(user.currentRoom, room.status);
});


async function prepareVotingResult(roomCode, roundNr) {
    //Get room
    console.log(`prepareVotingResult: ${roomCode}, ${roundNr}`);
    let roomSnapshot = await firestore.doc(`rooms/${roomCode}`).get();

    let roundSnapshot = await firestore.doc(`rooms/${roomCode}/rounds/${roundNr}`).get();
    let round = roundSnapshot.data();

    let questionIndex = round.vote_question_index;

    //Get question
    const questionNumber = questionIndex + 1; //array starts at 0
    console.log(`prepareVotingResult; index=${questionIndex} number=${questionNumber} -- rooms/${roomCode}/rounds/${roundNr}/questions/question${questionNumber}`);

    let questionSnapshot = await firestore
        .doc(`rooms/${roomCode}/rounds/${roundNr}/questions/question${questionNumber}`)
        .get();
    let question = questionSnapshot.data();
    let questionId = questionSnapshot.id;

    console.log(`prepareVotingResult:: ${questionId} -- ${question.question.question}`);

    //Get votes
    let votesCollection = await firestore.collection(`rooms/${roomCode}/rounds/${roundNr}/votes`).get();

    console.log(`prepareVotingResult:; votesCollection `);

    //Copy to vote_results
    let leftVotes = [];
    let rightVotes = [];

    votesCollection.forEach(async (voteSnapshot) => {
        let voter = voteSnapshot.id;
        let vote = voteSnapshot.data();

        if (vote[`question${questionNumber}`] === question.leftPlayer) {
            leftVotes.push(voter);
        } else if (vote[`question${questionNumber}`] === question.rightPlayer) {
            rightVotes.push(voter);
        } else {
            console.log(`prepareVotingResult:; vote Else ${voter} ${vote[`question${questionNumber}`]} `);
        }
    });

    let toWrite = {
        leftPoints: leftVotes.length,
        leftVotes: leftVotes,
        rightPoints: rightVotes.length,
        rightVotes: rightVotes
    };

    console.log(`prepareVotingResult;; ${toWrite}`);

    await firestore.doc(`rooms/${roomCode}/rounds/${roundNr}/vote_results/question${questionNumber}`)
        .set(toWrite);

    //show vote result
    await firestore.doc(`rooms/${roomCode}/rounds/${roundNr}`)
        .set({status: 'voteResult'}, {merge: true});
}


/**
 * Remove user from room
 * Can be used by VIP, to kick player or to remove himself, thereby deleting the room
 * Or can be used by other players to leave the room
 *
 * @type {HttpsFunction}
 */
export const removeUserFromRoom = functions.https.onCall(async (data, context) => {
        let deleteRoom = false; //true = real delete, false = soft delete
        let userUidToRemove = data.userToRemove;
        if (userUidToRemove == null) {
            //self
            userUidToRemove = context.auth.uid;
        }

        let isSelfRemove = (context.auth.uid === userUidToRemove);

        let userSnapshot = await firestore.doc(`users/${userUidToRemove}`).get();
        if (!userSnapshot.exists) {
            throw new Error(`User ${userUidToRemove} does not exist`);
        }
        let userToRemove = userSnapshot.data();
        if (userToRemove.currentRoom == null) {
            //user not in a room, done here
            return;
        }

        //When not self remove, check if caller is actually in same room and is the VIP
        if (!isSelfRemove) {
            let callerSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
            if (!userSnapshot.exists) {
                throw new Error(`Caller ${context.auth.uid} does not exist`);
            }
            let caller = callerSnapshot.data();
            if (caller.currency !== userToRemove.currentRoom) {
                throw new Error(`Caller ${context.auth.uid} and User ${userUidToRemove} are not in the same room. ${caller.currentRoom} & ${userToRemove.currentRoom}`);
            }
            let callerRoomSnapshot = await firestore.doc(`rooms/${caller.currentRoom}`).get();
            if (!callerRoomSnapshot.exists) {
                throw new Error(`Room ${caller.currentRoom} does not exist`);
            }
            let callerRoom = callerRoomSnapshot.data();
            if (callerRoom.vip !== context.auth.uid) {
                throw new Error(`Caller ${context.auth.uid} is not the VIP of room ${caller.currentRoom}`);
            }
            //Kick user
            //Remove user from room
            await firestore.doc(`rooms/${caller.currentRoom}/players/${userUidToRemove}`).delete();
            //Remove room from user
            await firestore.doc(`users/${userUidToRemove}`).set({currentRoom: null}, {merge: true});
        } else {
            //Removing self
            let userRoomSnapshot = await firestore.doc(`rooms/${userToRemove.currentRoom}`).get();
            if (!userRoomSnapshot.exists) {
                throw new Error(`Room ${userToRemove.currentRoom} does not exist, user ${userUidToRemove}`);
            }
            const userRoom = userRoomSnapshot.data();
            let userIsVip = (userRoom.vip === userUidToRemove && userUidToRemove === context.auth.uid);

            if (userIsVip) {
                //When VIP leaves room, (soft-) delete room
                if (deleteRoom) {
                    //real delete
                    await userRoomSnapshot.ref.delete();
                } else {
                    //soft delete
                    await firestore.doc(`rooms/${userToRemove.currentRoom}`).set({
                        status: 'deleted',
                        deleted_at: new Date()
                    }, {merge: true});
                }
            } else {
                //Remove user from room
                await firestore.doc(`rooms/${userToRemove.currentRoom}/players/${userUidToRemove}`).delete();
                //Remove room from user
                await firestore.doc(`users/${userUidToRemove}`).set({currentRoom: null}, {merge: true});
            }
        }
    }
);

export const startGame = functions.https.onCall(async (data, context) => {
    const addDefaultquestionPacks = true; //false=throw error on no questionPacks
    const defaultquestionPacks = ['mlp1', 'normal1', 'cah1'];

    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} is not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${context.auth.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.currentRoom}`);
    }

    if (room.status !== 'waiting_for_players') {
        throw new Error(`Room ${user.currentRoom} already started`);
    }

    let playersCollection = await firestore.collection(`rooms/${user.currentRoom}/players`).get();
    if (playersCollection.size < 3) {
        throw new Error(`Room ${user.currentRoom} does not have enough players`);
    }

    if (room.questionPacks === undefined || room.questionPacks == null || room.questionPacks.length === 0) {
        if (!addDefaultquestionPacks) {
            throw new Error(`No questionPacks in room ${user.currentRoom}`);
        }
        //Not enough questionPacks, add default
        await firestore.doc(`rooms/${user.currentRoom}`).set({questionPacks: defaultquestionPacks}, {merge: true});
    }

    await prepareRound(user.currentRoom, playersCollection, 1);

    await firestore.doc(`rooms/${user.currentRoom}`).set({status: 'round1'}, {merge: true});
});

async function prepareRound(roomCode, playerCollection, roundNr) {
    //get number of players
    const nrOfPlayers = playerCollection.size;

    //get all questions of all questionPacks, to select some random questions
    let questionPackPromises = [];
    let questions = []; //all questions of all questionPacks
    const roomSnapshot = await firestore.doc(`rooms/${roomCode}`).get();
    const room = roomSnapshot.data();
    room.questionPacks.forEach((questionPackId) => {
        questionPackPromises.push(
            firestore.collection(`questionpacks/${questionPackId}/questions`).get()
        );
    });

    console.log('getting all questions of questionPacks, room:' + roomCode);

    let questionPackResults = await Promise.all(questionPackPromises);

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
        } else {
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

        let promiseWriteQuestion =
            firestore.doc(`rooms/${roomCode}/rounds/round${roundNr}/questions/question${i}`)
                .set(questionObjectToSet);
        promiseWrites.push(promiseWriteQuestion);
    }
    //Write round object itself
    let promiseWriteRound =
        firestore.doc(`rooms/${roomCode}/rounds/round${roundNr}`)
            .set({
                roundnumber: roundNr,
                status: 'write_answers',
                started_at_wa: new Date(),
                questionsPerUser: questionsPerUser
            }, {merge: true});
    promiseWrites.push(promiseWriteRound);

    console.log('prepareRound writing questions (with players) to room...');
    await Promise.all(promiseWrites);
}


export const vipGoToNextRound = functions.https.onCall(async (data, context) => {
    console.log('vipGoToNextRound');
    let userSnapshot = await firestore.doc(`users/${context.auth.uid}`).get();
    if (!userSnapshot.exists) {
        throw new Error(`User ${context.auth.uid} does not exist`);
    }
    let user = userSnapshot.data();
    if (user.currentRoom == null) {
        throw new Error(`User ${context.auth.uid} is not in a room`);
    }
    let roomSnapshot = await firestore.doc(`rooms/${user.currentRoom}`).get();
    if (!roomSnapshot.exists) {
        throw new Error(`Room ${user.currentRoom} does not exist, user ${context.auth.uid}`);
    }
    let room = roomSnapshot.data();
    if (room.vip !== context.auth.uid) {
        throw new Error(`User ${context.auth.uid} is not the VIP of room ${user.currentRoom}`);
    }

    let playersCollection = await firestore.collection(`rooms/${user.currentRoom}/players`).get();

    //TODO: FIXME: use some proper number formatting!!
    let roundNumber = 0;
    if (room.status == 'round1') {
        roundNumber = 1;
    } else if (room.status == 'round2') {
        roundNumber = 2;
    } else if (room.status == 'round3') {
        roundNumber = 3;
    }
    roundNumber += 1;
    if (roundNumber > 3) {
        //game is over
        await firestore.doc(`rooms/${user.currentRoom}`).set({status: `game_over`}, {merge: true});
        await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).set({status: 'ended'},{merge: true});
    } else {
        await prepareRound(user.currentRoom, playersCollection, roundNumber);

        await firestore.doc(`rooms/${user.currentRoom}/rounds/${room.status}`).set({status: 'ended'},{merge: true});
        await firestore.doc(`rooms/${user.currentRoom}`).set({status: `round${roundNumber}`}, {merge: true});
    }
});

exports.ftnqCleanupAnonUsers = functions.https.onCall(async (data, context) => {
    if (context.auth.uid !== "98QSdK5XAyYfjSoCZFN9hyh50xg2") {
        return new Error('not allowed');
    }
    let listUsersResult = await admin.auth().listUsers();
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
});

/**
 * Generates a roomCode that's been checked to be unique
 * @returns {Promise<string>}
 */
async function getUniqueRoomCode() {
    let currentRoomCode = "";
    let maxTries = 10;
    for (let i = 0; i < maxTries; i++) {
        currentRoomCode = randomRoomCode();
        let roomDoc = await firestore.doc('rooms/' + currentRoomCode).get();
        if (!roomDoc.exists) {
            //Room does not exist, meaning roomCode is unique, and ready to be used.
            return currentRoomCode;
        }
    }
    throw new Error('cannot find unique roomCode');
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
async function deleteCollection(db, collectionPath, batchSize) {
    //https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
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