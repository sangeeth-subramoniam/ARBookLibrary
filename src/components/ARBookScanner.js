import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";

const ARBookScanner = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [bookBBox, setBookBBox] = useState(null);
  const [results, setResults] = useState(null);
  const [isResultsMinimized, setIsResultsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state

  useEffect(() => {
    const initializeTensorFlow = async () => {
      try {
        await tf.setBackend("webgl");
        console.log("WebGL backend initialized.");
      } catch (error) {
        console.warn("WebGL not available. Falling back to CPU backend.");
        await tf.setBackend("cpu");
      }

      await tf.ready();
      console.log("TensorFlow.js backend is ready.");

      const model = await cocoSsd.load();
      console.log("COCO-SSD model loaded.");

      const detectBooks = async () => {
        if (
          webcamRef.current &&
          webcamRef.current.video.readyState === 4 &&
          canvasRef.current
        ) {
          const video = webcamRef.current.video;
          const predictions = await model.detect(video);

          drawBoundingBoxes(predictions);

          const bookPrediction = predictions.find(
            (prediction) => prediction.class === "book"
          );

          if (bookPrediction) {
            setBookBBox(bookPrediction.bbox);
          } else {
            setBookBBox(null);
          }
        }
        requestAnimationFrame(detectBooks);
      };

      detectBooks();
    };

    initializeTensorFlow();
  }, []);

  const drawBoundingBoxes = (predictions) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = webcamRef.current.video.videoWidth;
    canvas.height = webcamRef.current.video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
      if (prediction.class === "book") {
        const [x, y, width, height] = prediction.bbox;

        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = "green";
        ctx.font = "16px Arial";
        ctx.fillText(
          `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
          x,
          y > 10 ? y - 5 : y + 15
        );
      }
    });
  };

  const handleScreenClick = async () => {
    if (!bookBBox) {
      console.log("No book detected to process.");
      alert('本を見つかりませんでした！')
      return;
    }

    setIsLoading(true); // Show loading spinner
    const [x, y, width, height] = bookBBox;
    await processBook(x, y, width, height);
    setIsLoading(false); // Hide loading spinner
  };

  const processBook = async (x, y, width, height) => {
    const video = webcamRef.current.video;

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.drawImage(
      video,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );

    const croppedImage = tempCanvas.toDataURL("image/jpeg");

    try {
      const saveResponse = await fetch("https://sicgaiken2.pythonanywhere.com/store-capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: croppedImage }),
      });

      if (!saveResponse.ok) {
        const saveError = await saveResponse.json();
        console.error("Error storing capture:", saveError);
        return;
      }

      const saveResult = await saveResponse.json();
      const { filePath } = saveResult;

      const fetchResponse = await fetch("https://sicgaiken2.pythonanywhere.com/fetch-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filePath }),
      });

      if (!fetchResponse.ok) {
        const fetchError = await fetchResponse.json();
        console.error("Error fetching results:", fetchError);
        return;
      }

      const fetchResult = await fetchResponse.json();

      setResults(fetchResult);
      setIsResultsMinimized(false); // Auto-expand results box
    } catch (error) {
      console.error("Error processing book:", error);
    }
  };

  const toggleResults = (event, minimize) => {
    event.stopPropagation(); // Prevent triggering handleScreenClick
    setIsResultsMinimized(minimize);
  };

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100vw",
        cursor: "pointer",
      }}
      onClick={handleScreenClick}
    >
      <Webcam
        ref={webcamRef}
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
        videoConstraints={{ facingMode: "environment" }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            padding: "20px",
            borderRadius: "10px",
            zIndex: 4,
          }}
        >
          <p>Loading...</p>
        </div>
      )}

      {/* Results Section */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "#fff",
          maxHeight: isResultsMinimized ? "40px" : "50%",
          overflowY: isResultsMinimized ? "hidden" : "auto",
          transition: "max-height 0.3s ease-in-out",
          zIndex: 3,
          borderTopLeftRadius: "15px",
          borderTopRightRadius: "15px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "10px",
            borderBottom: isResultsMinimized ? "none" : "1px solid #fff",
            display: "flex",
            justifyContent: "right",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Minimize and Expand Buttons */}
          <button
            style={{
              padding: "5px 10px",
              backgroundColor: "#00f",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={(event) => toggleResults(event, true)} // Minimize Results
          >
            ー
          </button>
          <button
            style={{
              padding: "5px 10px",
              backgroundColor: "#00f",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={(event) => toggleResults(event, false)} // Expand Results
          >
            &#x1F5D6;
          </button>
        </div>

        {!isResultsMinimized && results && (
          <div style={{ padding: "10px" }}>
            <p>
              <strong>Extracted Text:</strong> {results.extractedText || "N/A"}
            </p>
            <h4>Google Books Results:</h4>
            {results.googleBooksResults && results.googleBooksResults.length > 0 ? (
              results.googleBooksResults.map((book, index) => (
                <div key={index}>
                  <p>
                    <strong>{book.title}</strong> - {book.authors.join(", ")}
                  </p>
                  <a
                    href={book.infoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#00f" }}
                  >
                    View on Google Books
                  </a>
                </div>
              ))
            ) : (
              <p>No Google Books results found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ARBookScanner;
