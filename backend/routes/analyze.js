import { response, Router } from "express";

const analyzeRouter = Router();

analyzeRouter.post("/", (_request, response) => {
    response.status(501).json({
        success: false,
        error: {
            code: "NOT_IMPLEMENTED", 
            message:"The analysis endpoint is not implement yet.",
        },
    });
});

export default analyzeRouter;