import React, { useEffect, useState } from "react";
import { useEasybase } from "easybase-react";
import {
  Box,
  Typography,
  TextField,
  Button,
  AppBar,
  Toolbar,
  LinearProgress,
  InputAdornment,
  Chip,
} from "@material-ui/core";
import Footer from "./Footer";
import "./Actor.css";
import moment from "moment";
import PlayerPostDialog from "./PlayerPostDialog";
import axios from "axios";

const PlayerContainer = () => {
  const GUESSES = 5;
  const START_DATE = moment("2022-05-07", "YYYY-MM-DD");
  const NUM_ENTRIES = 198;
  const [easybaseData, setEasybaseData] = useState([]);
  const [firstNameAnswer, setFirstNameAnswer] = useState([]);
  const [lastNameAnswer, setLastNameAnswer] = useState([]);
  const [firstNameGuess, setFirstNameGuess] = useState([]);
  const [lastNameGuess, setLastNameGuess] = useState([]);
  const [hints, setHints] = useState([]);
  const [guessesLeft, setGuessesLeft] = useState(GUESSES);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [firstNameInput, setFirstNameInput] = useState([]);
  const [lastNameInput, setLastNameInput] = useState([]);
  const [error, setError] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isWinner, setIsWinner] = useState(false);
  const [openPost, setOpenPost] = useState(false);

  const { db } = useEasybase();

  const fetchPerson = async () => {
    const randNum = Math.floor(Math.random() * (NUM_ENTRIES + 1));
    const displayOrder =
      moment.duration(moment().startOf("day").diff(START_DATE)).asDays() + 1;
    const ebData =
      displayOrder > NUM_ENTRIES
        ? await db("PLAYER").return().limit(1).offset(randNum).all()
        : await db("PLAYER").return().where({ displayOrder }).all();
    if (ebData.length) {
      const data = ebData[0];
      setEasybaseData(data);
      setFirstNameAnswer(data.firstname.toUpperCase().split(""));
      setLastNameAnswer(data.lastname.toUpperCase().split(""));
      setFirstNameGuess(
        data.firstname
          .toUpperCase()
          .split("")
          .map((l, i) => (i === 0 ? l : "-"))
      );
      setLastNameGuess(
        data.lastname
          .toUpperCase()
          .split("")
          .map((l, i) => (i === 0 ? l : "-"))
      );
      setHints([
        {
          title: "reveal squad (2022)",
          hint: `${data.squad}`,
          revealed: false,
        },
        {
          title: "reveal position",
          hint: `${data.position}`,
          revealed: false,
        },
        {
          title: "reveal nation",
          hint: `${data.nation}`,
          revealed: false,
        },
      ]);
    }
  };

  const checkName = (answer, input, guess, type) => {
    const newGuess = [...guess];
    let matches = 0;
    answer.forEach((letter, i) => {
      if (letter === input[i]) {
        newGuess[i] = letter;
        matches = matches + 1;
      }
    });
    if (type === "first") {
      setFirstNameGuess(newGuess);
    } else {
      setLastNameGuess(newGuess);
    }

    return matches === answer.length ? true : false;
  };

  const checkGuess = () => {
    const checkFirst = checkName(
      firstNameAnswer,
      firstNameInput,
      firstNameGuess,
      "first"
    );
    const checkLast = checkName(
      lastNameAnswer,
      lastNameInput,
      lastNameGuess,
      "last"
    );

    if (checkFirst && checkLast) setIsWinner(true);
  };

  const giveUpHandler = () => {
    setGuessesLeft(0);
  };

  useEffect(() => {
    fetchPerson();
  }, []);

  useEffect(() => {
    const insertResult = async () => {
      const geo = await axios.get("https://geolocation-db.com/json/");
      db("RESULTS")
        .insert({
          ip: geo.data.IPv4,
          dateCreated: new Date(),
          isWinner,
          numGuesses: GUESSES - guessesLeft - hintsUsed,
          numHints: hintsUsed,
          actorName: `${easybaseData.firstname} ${easybaseData.lastname}`,
          city: geo.data.city,
          countryCode: geo.data.country_code,
          countryName: geo.data.country_name,
          postal: geo.data.postal,
          state: geo.data.state,
          latitude: geo.data.latitude,
          longitude: geo.data.longitude,
        })
        .one();
    };
    if (guessesLeft === 0 || isWinner) {
      setOpenPost(true);
      insertResult();
    }
  }, [guessesLeft, isWinner]);

  useEffect(() => {
    if (firstNameAnswer.length > 1) checkGuess();
  }, [firstNameInput, lastNameInput]);

  const revealHandler = (index) => {
    if (guessesLeft > 0) setGuessesLeft(guessesLeft - 1);
    const newHints = [...hints];
    newHints[index].revealed = true;
    setHints(newHints);
    setHintsUsed(hintsUsed + 1);
  };

  const guessHandler = (e) => {
    e.preventDefault();
    const guess = e.target.guess.value;
    const parts = guess.split(" ");
    if (parts.length !== 2) {
      setError(true);
      setErrorText("submit a first and last name please");
    } else {
      setError(false);
      setErrorText("");
      setFirstNameInput(parts[0].toUpperCase());
      setLastNameInput(parts[1].toUpperCase());
      if (guessesLeft > 0) setGuessesLeft(guessesLeft - 1);
    }
    const guessInput = document.getElementById("guess");
    guessInput.value = "";
  };

  return (
    <>
      <AppBar position="sticky" className="appBar">
        <Toolbar>
          <Box
            display="flex"
            justifyContent={"space-between"}
            alignItems={"center"}
            width="100%"
          >
            <Box className="guessTitlePlayer">{"name that wsl player"}</Box>
            <Box>
              <Chip
                label={guessesLeft}
                color="secondary"
                className="guessChip"
              />
              {`guesses`}
            </Box>
          </Box>
        </Toolbar>
        {!easybaseData.firstname && <LinearProgress />}
      </AppBar>
      {easybaseData.firstname && (
        <Box display="flex" justifyContent="center" alignItems={"center"}>
          <Box maxWidth={"700px"}>
            <Box display="flex" flexDirection="column">
              <Chip
                className="hintChip"
                label="hints (cost 1 guess)"
                color="primary"
              />
              {hints.map((hint, index) =>
                hint.revealed ? (
                  <Chip
                    className="hintChip"
                    label={hint.hint}
                    color="primary"
                  />
                ) : guessesLeft > 0 ? (
                  <Chip
                    onClick={() => revealHandler(index)}
                    className="hintChip"
                    color="secondary"
                    label={hint.title}
                  />
                ) : (
                  <Chip
                    className="hintChip"
                    label={hint.title}
                    disabled
                    color="secondary"
                  />
                )
              )}
            </Box>
            <Box mt={4}>
              <Box display="flex">
                {firstNameGuess.map((letter) => (
                  <Box
                    className={
                      firstNameAnswer.length > 8 || lastNameAnswer.length > 8
                        ? "smallLetter letter"
                        : "letter"
                    }
                  >
                    {letter}
                  </Box>
                ))}
              </Box>
              <Box display="flex">
                {lastNameGuess.map((letter) => (
                  <Box
                    className={
                      firstNameAnswer.length > 8 || lastNameAnswer.length > 8
                        ? "smallLetter letter"
                        : "letter"
                    }
                  >
                    {letter}
                  </Box>
                ))}
              </Box>
            </Box>
            {guessesLeft > 0 && !isWinner && (
              <Box width="100%">
                <form onSubmit={(e) => guessHandler(e)} className="form">
                  <Typography className="giveUp" onClick={giveUpHandler}>
                    Give Up
                  </Typography>
                  <TextField
                    autoComplete="new-password"
                    fullWidth
                    label="enter guess"
                    variant="outlined"
                    name="guess"
                    error={error}
                    helperText={errorText}
                    id="guess"
                    InputProps={{
                      autocomplete: "off",
                      autoComplete: "no",
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button type="submit" color="primary">
                            submit
                          </Button>
                        </InputAdornment>
                      ),
                      form: {
                        autocomplete: "off",
                        autoComplete: "no",
                      },
                    }}
                  />
                </form>
              </Box>
            )}
          </Box>
          <PlayerPostDialog
            open={openPost}
            setOpen={setOpenPost}
            isWinner={isWinner}
            hintsUsed={hintsUsed}
            guessesUsed={GUESSES - guessesLeft}
            name={`${easybaseData.firstname} ${easybaseData.lastname}`}
          />
        </Box>
      )}

      {!easybaseData.firstname && (
        <Footer text={"Just as fun as wordle right?"} />
      )}
    </>
  );
};

export default PlayerContainer;
