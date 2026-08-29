package com.platform.ugc.service.offer;

/** Thrown for invalid take/leave requests — offer not found, inactive, or not currently taken. */
public class WorkerOfferException extends RuntimeException {
    public WorkerOfferException(String message) {
        super(message);
    }
}
