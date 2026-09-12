import Task from "../models/Task.js";

const createTask = async (req, res) => {
    try {
        const {
            title,
            description,
            reward,
            pickupLocation,
            dropLocation,
            createdBy
        } = req.body;

        const newTask = await Task.create({
            title,
            description,
            reward,
            pickupLocation,
            dropLocation,
            createdBy
        });

        res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error creating task"
        });
    }
};

export { createTask };