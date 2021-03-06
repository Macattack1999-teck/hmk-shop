import React, { useState, useEffect, useContext } from "react";
import CartContext from "../../Contexts/CartContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MobileSideNavContext from "../../Contexts/MobileSideNavContext";

export default () => {
  const [prevWindowWidth, setPrevWindowWidth] = useState(
    window.document.body.clientWidth
  );
  const { setIsCartOpen, products } = useContext(CartContext);
  const { setIsSideNavOpen } = useContext(MobileSideNavContext);
  let timeout = false;

  const handleCartToggle = () => {
    const htmlElement = document.getElementById("html");
    htmlElement.classList.toggle("html-overflow-hidden");
    setIsCartOpen(true);
  };

  const handleOpeningHiddenNav = () => {
    const htmlElement = document.getElementById("html");
    htmlElement.classList.toggle("html-overflow-hidden");
    setIsSideNavOpen(true);
  };

  useEffect(() => {
    const permElmnt = document.getElementById("navbar-wrapper-id");
    const injectedElmnt = document.getElementsByClassName("box-shadow");

    window.addEventListener(
      "scroll",
      () => {
        if (window.pageYOffset > 0 && injectedElmnt.length === 0) {
          permElmnt.classList.toggle("box-shadow");
        } else if (window.pageYOffset === 0 && injectedElmnt.length !== 0) {
          permElmnt.classList.toggle("box-shadow");
        }
      },
      false
    );
  }, []);

  useEffect(() => {
    window.addEventListener(
      "resize",
      () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (
            window.document.body.clientWidth >= 1023 &&
            prevWindowWidth < 1023
          ) {
            setPrevWindowWidth(window.document.body.clientWidth);
          } else if (
            window.document.body.clientWidth < 1023 &&
            prevWindowWidth >= 1023
          ) {
            setPrevWindowWidth(window.document.body.clientWidth);
          }
        }, 500)
      },
      false
    );

    return () => {
      window.removeEventListener("resize", function() {
        return;
      });
    };
  });

    return (
      <div
        className="navbar-wrapper"
        id="navbar-wrapper-id"
        style={{
          height: "50px",
          padding: "0 40px",
          display: "flex",
          alignItems: "center"
        }}
      >
        <div
          style={{ width: "10%", fontSize: "20px", cursor: "pointer" }}
          onClick={handleOpeningHiddenNav}
        >
          <FontAwesomeIcon icon={["fas", "bars"]} />
        </div>

        <div
          className="navbar-logo-wrapper"
          style={{ width: "80%", height: "50px" }}
        >
          HMK Shop
        </div>

        <div
          className="navbar-link"
          onClick={handleCartToggle}
          style={{
            width: "10%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            fontSize: "20px",
            cursor: "pointer"
          }}
        >
          <FontAwesomeIcon icon={["fas", "shopping-cart"]} />
        </div>
      </div>
    );
};
