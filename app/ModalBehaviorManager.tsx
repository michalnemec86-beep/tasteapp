"use client";

import {
  useEffect,
  useRef,
} from "react";

function hasOpenModal() {
  return Boolean(
    document.querySelector(
      '[role="dialog"][aria-modal="true"]'
    )
  );
}

export default function ModalBehaviorManager() {
  const scrollYRef =
    useRef(0);

  const lockedRef =
    useRef(false);

  useEffect(() => {
    const body =
      document.body;

    const html =
      document.documentElement;

    const previous = {
      bodyPosition:
        body.style.position,
      bodyTop:
        body.style.top,
      bodyLeft:
        body.style.left,
      bodyRight:
        body.style.right,
      bodyWidth:
        body.style.width,
      bodyOverflow:
        body.style.overflow,
      htmlOverflow:
        html.style.overflow,
      htmlOverscroll:
        html.style.overscrollBehavior,
    };

    function lock() {
      if (
        lockedRef.current
      ) {
        return;
      }

      scrollYRef.current =
        window.scrollY;

      body.style.position =
        "fixed";
      body.style.top =
        `-${scrollYRef.current}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width =
        "100%";
      body.style.overflow =
        "hidden";

      html.style.overflow =
        "hidden";
      html.style.overscrollBehavior =
        "none";

      lockedRef.current =
        true;
    }

    function unlock() {
      if (
        !lockedRef.current
      ) {
        return;
      }

      body.style.position =
        previous.bodyPosition;
      body.style.top =
        previous.bodyTop;
      body.style.left =
        previous.bodyLeft;
      body.style.right =
        previous.bodyRight;
      body.style.width =
        previous.bodyWidth;
      body.style.overflow =
        previous.bodyOverflow;

      html.style.overflow =
        previous.htmlOverflow;
      html.style.overscrollBehavior =
        previous.htmlOverscroll;

      lockedRef.current =
        false;

      window.scrollTo(
        0,
        scrollYRef.current
      );
    }

    function sync() {
      if (
        hasOpenModal()
      ) {
        lock();
      } else {
        unlock();
      }
    }

    sync();

    const observer =
      new MutationObserver(
        sync
      );

    observer.observe(
      body,
      {
        childList: true,
        subtree: true,
      }
    );

    return () => {
      observer.disconnect();
      unlock();
    };
  }, []);

  return null;
}
